# 사용자 의견 이미지 첨부 구현 계획

## 상태

- 상태: **활성 계획**
- 시작일: 2026-08-24
- 추적 이슈: [#212 사용자 의견 이미지 첨부 지원](https://github.com/woowacourse-teams/2026-poudy/issues/212)
- 관련 이슈: [#206 의견 등록 API 구현](https://github.com/woowacourse-teams/2026-poudy/issues/206)
- 소유 도메인: `feedback`

이 문서는 아직 구현되지 않은 목표와 결정만 소유한다. 현재 동작의 권위 원천은
`FeedbackController`, `FeedbackService`, `S3FeedbackRepository`, `ARCHITECTURE.md`와 생성된
OpenAPI 문서다. 구현이 끝나면 복구하기 어려운 결정만 `ARCHITECTURE.md`로 옮기고 이 계획은
완료 디렉터리로 이동한다.

## 목표와 현재 기준선

기존 `POST /api/feedback`의 JSON 계약과 `204 No Content`를 깨지 않으면서 선택적인 이미지
1~5장을 첨부한다. 이미지는 서버가 검증하고 재인코딩한 결과만 S3에 비공개·암호화 상태로
보관하며 원본 바이트, 원본 파일명과 저장소 URL은 보존하거나 노출하지 않는다.

현재 서버에는 이미지 업로드·검증, pending/claim/commit 저장 경계와 정기 정리가 구현되어
있고 운영 nginx의 이미지 경로도 26 MiB 요청을 받는다. 남은 운영 기준선은 실제 AWS 보안·IAM
검증, 수동 보유 기간 집행과 개인정보 처리방침의 일치 여부다.

## 범위와 경계

서버 변경 범위는 다음과 같다.

- 이미지 업로드 API와 기존 의견 등록 API의 선택적 `imageIds`
- JPEG/PNG 판별, 제한 검사, 단일 프레임 확인과 재인코딩
- S3 임시 저장, 조건부 claim, 최종 귀속, 보상 처리와 만료 판정
- 피드백 JSON의 첨부 이미지 목록과 Discord 알림의 첨부 개수
- 오류 계약, 설정, OpenAPI와 공통 API 생성물, 테스트와 아키텍처 기록

다음은 완료에 필요하지만 `server/AGENTS.md`의 수정 경계 밖이다. 서버 구현과 같은 변경으로
몰래 수정하지 않고 소유 영역의 별도 변경과 운영 적용을 선행 조건으로 추적한다.

- `deploy/nginx/*`: multipart 오버헤드를 포함한 본문 상한 반영
- AWS 버킷/IAM: Public Access Block, 암호화와 최소 객체 권한 적용
- `client/app/privacy/page.tsx`: 선택적 이미지 수집 항목과 실제 보유 기간 반영
- `deploy/README.md`: lifecycle 권한이 없는 버킷의 수동 보유 기간 집행 절차 기록

## API 계약

### 이미지 업로드

`POST /api/feedback/images`는 `multipart/form-data`의 반복 파트 `images`를 1~5개 받는다.
성공은 임시 S3 객체가 모두 저장된 상태를 뜻하며 `201 Created`와 다음 본문을 반환한다.

```json
{
  "imageIds": [
    "8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf"
  ]
}
```

- `imageIds`는 `UUID.randomUUID()`로 만든 추측하기 어려운 일회성 UUID이며 요청 파트 순서와
  같은 순서다.
- 응답에는 확장자, 파일명, S3 키와 URL을 싣지 않는다.
- 전체 성공만 응답한다. 한 파일이라도 실패하면 생성한 임시 객체를 모두 삭제하고 ID를
  하나도 반환하지 않는다.
- 공개 업로드가 의견 등록 없이 S3 비용을 만들지 않게 클라이언트 주소별 별도 업로드
  제한기(기본 시간당 5배치)를 적용한다. 기존 의견 등록 제한과 카운터를 공유하지 않으며,
  정상적인 `upload → submit` 흐름은 각 독립 정책을 한 번씩 소비한다.

### 의견 등록

기존 요청에 선택 필드 `imageIds`를 추가한다.

```json
{
  "type": "DATA_CORRECTION",
  "content": "제품 정보가 실제 패키지와 달라요.",
  "path": "/products/12345",
  "imageIds": [
    "8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf"
  ]
}
```

- 필드 생략과 `null`은 빈 목록으로 정규화해 기존 클라이언트를 유지한다.
- 최대 5개이며 중복 ID는 외부 저장소 호출 전에 거절한다.
- 형식 오류, 미존재, 논리적 만료, 이미 claim되었거나 소비된 ID는 존재 여부를 구분해
  노출하지 않고 같은 `400 INVALID_FEEDBACK_IMAGE_ID`로 반환한다.
- 이미지가 없든 있든 성공 응답은 기존과 같은 `204 No Content`다.

이미지 내용·개수·크기 규칙 위반은 `400 INVALID_FEEDBACK_IMAGE`, 프록시나 애플리케이션의
본문 상한 초과는 `413 PAYLOAD_TOO_LARGE`로 통일한다. 두 경로 모두 기존 RFC 9457
`ProblemDetail` 형식, `429 TOO_MANY_REQUESTS`, `500 INTERNAL_SERVER_ERROR`를 유지한다.
nginx가 먼저 차단한 413은 Spring 예외 처리기를 거치지 않으므로 이미지 업로드 전용 location의
`error_page`도 같은 `application/problem+json` 본문을 직접 반환해야 한다.

## 이미지 검증과 재인코딩

애플리케이션과 프록시는 디코딩 전에 다음 상한을 적용한다.

- 파일별 5 MiB
- 파일 합계 25 MiB
- 요청 전체 26 MiB: 25 MiB 파일 합계에 multipart 경계와 파트 헤더용 1 MiB를 별도로 둔다.
- 파일 수 1~5개

`FeedbackImageProcessor`는 파일명, 확장자와 선언된 Content-Type을 판정에 사용하지 않고 파일
바이트만 처리한다.

1. 제한된 입력 스트림으로 실제 읽은 바이트가 파일·합계 상한 안인지 다시 확인한다.
2. JPEG SOI 또는 PNG 8바이트 시그니처를 확인한다.
3. 바이트에서 선택한 `ImageReader`의 실제 format이 JPEG/PNG인지 확인한다.
4. 전체 픽셀 디코딩 전에 width, height를 읽어 각 축 4,096px 이하, `long` 곱셈 기준 총
   16,000,000px 이하인지 확인한다.
5. 이미지 수가 정확히 하나인지 확인한다. PNG는 `acTL` chunk도 명시적으로 거절해 기본
   reader가 APNG의 첫 프레임만 읽고 통과시키지 않게 하고, JPEG는 MPO 표식과 두 번째
   SOI/EOI 이미지가 뒤따르는 입력을 거절한다.
6. 첫 이미지를 끝까지 디코딩하며 손상·잘림과 reader warning을 거절한다.
7. 픽셀만 새 `BufferedImage`로 옮겨 JPEG는 RGB, PNG는 RGBA로 한 장씩 재인코딩한다.
   writer에는 원본 metadata를 전달하지 않아 EXIF, ICC, 텍스트, 썸네일과 뒤따른 비이미지
   데이터를 제거한다.
8. 재인코딩 결과의 시그니처와 단일 이미지 디코딩을 한 번 더 확인한 뒤 S3에 넘긴다.

재인코딩 결과도 파일별 5 MiB 상한을 적용한다. multipart 구현이 요청 처리 중 만든 임시
파일은 요청 종료 시 프레임워크가 삭제하게 하며 애플리케이션의 영속 디렉터리나 로그로
복사하지 않는다.

한 번에 한 이미지의 디코딩 버퍼와 재인코딩 바이트만 유지하고 S3 저장이 끝나면 즉시
참조를 버린다. 프로세스 전체의 동시 디코딩 수도 설정 상한으로 제한하고 슬롯이 없으면 대기
요청을 쌓지 않고 429로 거절한다. 원본 파일명은 processor와 repository 메서드 인자에 전달하지
않는다.

## S3 상태와 키

이미지 상태는 다음 키로 표현한다.

```text
poudy/feedback/pending/{imageId}.jpg|png
poudy/feedback/claims/{imageId}.json
poudy/feedback/{feedbackId}/images/{imageId}.jpg|png
poudy/feedback/{feedbackId}.json
```

- pending 이미지의 `Last-Modified + 24h`를 논리적 만료 시각으로 사용한다. 만료된 객체는
  주기적 정리가 아직 물리적으로 지우지 않았어도 API에서 거절한다.
- UUID만 받은 저장소는 `.jpg`와 `.png`를 조회해 정확히 한 pending 객체만 존재할 때 format을
  확정한다. 둘 다 없거나 비정상적으로 둘 다 존재하면 같은 잘못된 ID로 거절한다.
- claim 객체는 `If-None-Match: *` 조건부 `PutObject`로 생성한다. S3의 단일 키 조건부 쓰기와
  강한 read-after-write 일관성을 동시 귀속의 직렬화 지점으로 사용한다.
- claim 본문은 `feedbackId`, 정규화된 format, source ETag, claim 시각과 저장할 피드백 JSON의
  SHA-256만 가진다. 모든 입력 ID를 정렬한 순서로 claim해 교차 배치 충돌을 빠르게 끝내되,
  최종 JSON의 이미지 순서는 클라이언트가 보낸 순서를 유지한다.
- 최종 복사는 source ETag가 같은 경우에만 수행하고 목적 키에는 `If-None-Match: *`를 건다.
- 피드백 JSON도 결정적인 바이트로 한 번 만들고 `If-None-Match: *` 조건부 `PutObject`로
  저장한다. 같은 `feedbackId`의 문서를 조용히 덮어쓰지 않는다.
- 모든 `PutObject`와 `CopyObject`는 `AES256` 서버 측 암호화를 명시하고 ACL과 공개 URL을
  만들지 않는다.

조건부 claim은 여러 서버 인스턴스에서도 한 ID를 한 요청만 소유하게 한다. `412`는 사용자가
재시도할 저장소 장애가 아니라 이미 claim된 ID로 해석하고, 조건부 write와 delete가 맞물린
`409`만 짧고 제한된 횟수로 재시도한다.

## 의견 등록과 보상 순서

이미지가 있는 의견은 다음 순서로 처리한다.

```text
요청·중복 검증 → 의견/feedbackId 생성 → 요청 제한
  → pending 존재·만료 확인
  → 모든 imageId 조건부 claim
  → 모든 이미지를 최종 경로로 복사
  → images 목록을 포함한 피드백 JSON 저장  ← commit point
  → pending 삭제
  → claim 삭제
  → Discord 알림
```

- claim이나 복사 중 하나라도 실패하면 이미 만든 최종 객체를 먼저 지우고, 삭제 성공을
  확인한 뒤 이 요청이 만든 claim을 지운다. pending은 건드리지 않아 만료 전 다시 쓸 수 있다.
- 피드백 JSON 쓰기는 `확정 성공`, `확정 실패`, `결과 불명`으로 구분한다. SDK가 성공을
  반환하면 확정 성공이다. timeout이나 5xx처럼 S3가 저장한 뒤 응답만 유실됐을 수 있으면
  정확한 키를 list/get해 JSON SHA-256을 비교한다. 같은 문서가 있으면 성공, 부재가 확인되면
  실패이며, 권한 오류·재조회 timeout·다른 문서처럼 판정할 수 없으면 결과 불명이다.
- 확정 실패일 때만 같은 rollback을 수행한다. 결과 불명에서는 최종 이미지와 claim을 보존한
  채 500을 반환하고 조정기가 귀결하게 한다. 이미 commit된 JSON의 참조 이미지를 추측으로
  삭제하지 않는다.
- JSON 저장 뒤 pending/claim 정리만 실패하면 접수 자체를 실패시키지 않는다. JSON이 commit
  point이므로 재시도가 중복 의견을 만들지 않게 하고, 정리 작업을 재시도 대상으로 남긴다.
- pending delete는 응답의 키별 성공·실패를 확인한다. 각 이미지의 pending이 삭제됐거나
  이미 없다는 사실을 확인한 뒤에만 그 ID의 claim을 지운다. delete 결과 불명이나 일부 실패면
  해당 claim을 남겨 같은 ID가 다시 귀속되지 않게 한다.
- 프로세스 종료나 보상 S3 장애에 대비해 claim을 즉시 지우지 않는다. 각 S3 호출의 15초
  timeout과 5장 등록·보상의 제한된 순차 호출 수보다 충분히 긴 10분이 지난 claim만 주기적으로
  조정한다. 나이는 앱 시계가 아니라 claim 객체의 S3 `Last-Modified`로 판정한다.
- claim 조정기는 기본 1분 주기로 exact-prefix list에서 피드백 JSON의 존재를 확인하고 GET한 문서의 SHA-256이 claim과
  같은 경우에만 commit으로 판정한다. commit이면 pending 부재를 확인한 뒤 claim을 지우고,
  JSON 부재가 확인되면 최종 객체를 제거한 뒤 claim을 지운다. `AccessDenied`, timeout, hash
  불일치에서는 아무것도 삭제하지 않고 다음 주기로 넘긴다. 작업은 중복 실행해도 같은 결과가
  되게 한다.
- 기본 1시간 주기의 별도 만료 정리 작업은 24시간이 지난 pending을 삭제한다. 진행 중 claim이 있는
  객체는 claim 조정에 맡기고 건너뛰며, claim 직전에 만료 시각을 다시 확인해 정리 작업과의
  경합에서 만료 이미지를 새로 소유하지 못하게 한다.
- 최종 이미지도 같은 정리 주기에 훑어 10분보다 오래됐는데 같은 `feedbackId`의 JSON이 확정
  부재인 객체를 삭제한다. 전체 prefix 목록에 포함된 피드백 JSON으로 존재 여부를 함께 판정해
  이미지별 추가 list 요청을 만들지 않는다. claim 자체가 유실돼도 고아 최종 이미지가 전체
  피드백 보유 기간까지 남지 않게 한다.
- 배치 업로드 도중 실패하면 그 배치에서 성공한 pending 키를 한 번의 bulk delete로 정리한다.
  delete 자체가 실패한 객체는 반환된 ID가 없어 사용할 수 없고 위 만료 정리가 다시 삭제한다.

S3는 여러 키에 대한 원자적 트랜잭션을 제공하지 않으므로 즉시 보상, 결과 불명 보존,
durable claim·고아 조정을 함께 둔다. 각 S3 호출은 기존 15초 API 호출 timeout과 5초 시도
timeout을 그대로 사용한다. nginx는 일반 API의 30초 제한을 늘리지 않고 두 피드백 쓰기
엔드포인트만 upstream 응답 대기를 180초로 두며, 운영 경로에서 처리 시간과 504 여부를
실측한다.

## 피드백 JSON, Discord와 로그

피드백 JSON에는 기존 필드와 함께 요청 순서대로 다음 `images`를 저장한다.

```json
{
  "images": [
    {
      "imageId": "8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf",
      "extension": "jpg"
    }
  ]
}
```

이미지가 없는 기존 요청도 `images: []`를 저장해 새 문서 모양을 하나로 유지한다. Discord
메시지는 유형, 화면, 접수 시각, 접수 ID, 첨부 이미지 개수와 의견 본문을 2,000자 안으로
보내며 `allowed_mentions.parse=[]`로 멘션 해석을 차단한다.

애플리케이션 로그에는 content/path 같은 사용자 입력, 원본·재인코딩 바이트, 파일명,
`imageId`, S3 키와 URL을 남기지 않는다. 보상·정리 실패 로그는 작업 종류, `feedbackId`, 개수,
예외 클래스와 AWS request ID처럼 객체 키를 포함하지 않는 진단값만 남긴다. S3 SDK 예외를
그대로 공통 `InfrastructureException`의 cause로 로깅하면 요청 키가 섞일 수 있으므로 이미지
저장 경계에서 안전한 진단 정보로 변환한다.

## 운영 저장 정책

애플리케이션 인스턴스 역할에는 feedback 버킷의 정확한 객체와 list prefix에 대해서만 다음
권한을 둔다.

- pending, claims, 피드백 JSON과 최종 이미지 객체의 `s3:PutObject`, `s3:GetObject`,
  `s3:DeleteObject`. S3 copy는 별도 `Copy` IAM action이 아니라 source `GetObject`와 destination
  `PutObject`를 사용한다.
- pending/claims 열거, exact feedback JSON commit 확인과 고아 최종 이미지 정리에 필요한
  `s3:ListBucket`. 버킷 전체 열거가 되지 않게 허용 `s3:prefix` 조건을 명시한다.
- 버킷 lifecycle이나 공개 설정을 바꾸는 권한은 부여하지 않는다.

실제 인스턴스 역할로 존재 객체 GET, exact-prefix list의 부재, `AccessDenied`를 각각 재현해
부재와 권한 실패가 다른 저장 결과가 되는지 확인한다. 403을 404로 간주하지 않는다.

버킷 보안 설정은 애플리케이션 시작 코드가 아니라 배포/IaC가 소유한다.

- Block Public Access 전체 활성화와 HTTPS 강제
- 기본 암호화와 요청의 명시적 SSE-S3 일치

현재 운영 버킷은 버전 관리가 비활성화되어 있고 팀에 lifecycle 설정 권한이 없다. 따라서
애플리케이션의 주기적 작업이 pending, claim과 고아 최종 이미지를 정리하고, 접수된 피드백
JSON과 연결된 최종 이미지는 운영자가 AWS 콘솔에서 수동으로 삭제한다. 애플리케이션은 버킷
lifecycle이나 버전 관리 상태를 조회·변경하지 않는다.

정상 정리 주기를 지나 남은 pending이나 7일이 지난 claim은 단순 만료 대상으로 보지 않고
스케줄러 장애, 권한 오류 또는 commit 판정 불명 신호로 취급한다. 주간 운영 점검에서 관련
피드백 JSON과 서버 로그를 확인한 뒤 commit이면 pending·claim만, rollback이면 pending·최종
이미지·claim을 삭제한다. 원인을 판정하지 못한 객체는 추측으로 지우지 않고 권한과 장애를
먼저 복구한다.

수동 삭제는 최소 주 1회 실행한다. 실행일 사이의 최대 7일을 고려해 피드백 JSON의 S3
`Last-Modified`가 83일 이상인 접수를 대상으로 삼고, 같은 `feedbackId`의
`poudy/feedback/{feedbackId}/images/` 객체와 `poudy/feedback/{feedbackId}.json`을 모두
삭제한다. 이 기준은 접수일로부터 90일을 넘기지 않게 한다. 버전 관리가 비활성화되어 일반
삭제가 곧 영구 삭제이며 이전 버전과 delete marker를 따로 정리하지 않는다. 구체적인 실행·검증
절차와 기록 항목은 `deploy/README.md`를 권위 원천으로 둔다.

개인정보 처리방침은 자동 삭제라고 표현하지 않고 접수일로부터 90일 이내 보유한다고 알린다.
수동 절차를 수행할 운영 책임과 기록을 유지할 수 없게 되면 lifecycle 권한 확보나 별도 자동
정리 작업을 선행하기 전까지 이미지 첨부를 운영에 노출하지 않는다.

## 구현 단위

1. controller DTO와 오류 계약에 업로드 요청·응답, 선택적 `imageIds`, 413과 이미지 전용 오류를
   추가한다.
2. 이미지 ID·format·목록 불변식과 순수 이미지 processor를 구현한다.
3. S3 이미지 저장소에 pending 저장/정리, 조건부 claim, copy, rollback, commit 정리를 구현한다.
4. 이미지 업로드 서비스와 기존 `FeedbackService`에 두 유스케이스를 연결한다.
5. 결과 불명 commit 확인, 오래된 claim·고아 최종 이미지 조정과 pending 만료 정리를 추가한다.
6. 피드백 JSON의 images와 Discord 알림의 첨부 이미지 개수를 반영한다.
7. multipart 상한, 이미지 업로드 요청 제한과 S3 설정을 추가한다.
8. Controller·DTO를 권위 원천으로 OpenAPI와 공통 Zod 생성물을 갱신한다.
9. `ARCHITECTURE.md`에는 API 분리 이유, claim/commit point와 부분 실패 정책만 반영한다.
10. nginx, AWS, 개인정보 처리방침과 수동 삭제 절차의 별도 소유 변경과 실제 적용 결과를 확인한다.

## 테스트와 검증

### 이미지 처리

- 실제 JPEG/PNG 성공, 선언 Content-Type·파일명 불일치 성공
- 빈 파일, 잘못된 시그니처, 시그니처만 맞는 손상 파일, 디코딩 warning 거절
- APNG/다중 이미지, 각 축 4,096 초과, 16MP 초과 거절
- 파일 5 MiB, 합계 25 MiB 경계와 초과, 0개·6개 거절
- EXIF/ICC/PNG text와 뒤따른 비이미지 바이트가 출력에 남지 않고 픽셀·알파가 보존됨
- 5장을 요청 순서대로 처리하며 동시에 둘 이상의 원본/출력 버퍼를 보유하지 않음

### 저장과 유스케이스

- 1장·5장 정상 업로드의 순서, 키, Content-Type, 암호화와 반환 ID
- 두 번째 pending 저장 실패 시 첫 객체 삭제와 일부 ID 미반환
- 생략된 `imageIds`의 기존 204 및 외부 이미지 저장소 미호출
- 중복·미존재·정확히 24시간 지난 ID와 이미 claim된 ID 거절
- 두 스레드가 같은 ID를 귀속할 때 조건부 claim 한 건만 성공
- 여러 ID 중 claim/copy 일부 실패, 피드백 JSON 실패의 역순 보상과 pending 재사용
- S3가 피드백 JSON을 저장한 뒤 timeout을 반환하는 결과 불명에서 이미지·claim을 보존하고,
  같은 JSON hash를 확인한 조정기가 commit 정리를 완료함
- JSON 확정 부재와 `AccessDenied`를 구분하며 권한 오류에서는 rollback하지 않음
- JSON 저장 뒤 정리 실패는 204를 유지하고 조정기가 정리를 완료함
- 중단 상태를 나타내는 오래된 claim에 대해 commit/rollback 조정이 멱등함
- 10분보다 어린 fresh claim은 조정하지 않고, 경계를 지난 claim만 조정함
- bulk pending 삭제의 일부 키 실패 시 성공한 ID의 claim만 지우고 실패한 ID의 claim은 유지함
- claim이 없는 고아 최종 이미지를 JSON 확정 부재일 때만 삭제함
- 정확히 24시간 경계의 논리적 만료와 진행 중 claim을 건너뛰는 pending 정리
- 피드백 JSON 이미지 순서와 Discord 첨부 개수·2,000자 제한·멘션 차단
- 로그에 사용자 입력, 파일명, `imageId`, S3 키·URL과 SDK 예외 메시지가 없음

### 계약과 완료 검증

- MockMvc로 multipart 201, 의견 204, 400/429/500 ProblemDetail 계약을 검증하고, 실제 포트의
  embedded server에 raw multipart 요청을 보내 파일별·전체 상한과 애플리케이션 413 본문을
  검증한다. MockMvc만으로 multipart parser 상한을 검증했다고 간주하지 않는다.
- OpenAPI에서 multipart binary 배열, 선택적 UUID 배열과 필수 응답 `imageIds` 확인
- `./gradlew generateApiArtifacts`로 `server/openapi.json`, `common/api.zod.ts`,
  `common/api.zod.types.d.ts` 갱신
- `sh ./scripts/test.sh` 후 `sh ./scripts/verify.sh` 통과
- 운영 전 이미지 업로드 전용 nginx 26 MiB 상한과 nginx 자체 413 ProblemDetail, 버킷 공개
  차단·암호화·버전 관리 비활성 상태와 IAM policy를 실제 요청·설정 조회로 확인
- 개인정보 처리방침의 이미지 수집·보유 기간과 `deploy/README.md`의 주 1회 수동 삭제 절차가
  일치하는지 확인하고, 83일 기준 대상의 이미지·JSON이 모두 삭제되는지 운영 권한으로 검증

## 진행 기록

- 2026-08-24: 이슈와 현재 피드백/S3/오류/생성물/배포 경계를 조사하고 최초 구현 계획을 작성했다.
- 2026-08-24: 서버에 이미지 업로드·검증·재인코딩, pending/claim/commit과 조정 작업,
  선택적 `imageIds`, 기존 Discord 알림 형식 유지와 별도 요청 제한을 구현했다. OpenAPI와 공통 Zod 생성물을
  갱신했고 `sh ./scripts/verify.sh`가 통과했다.
- 2026-08-24: 서버 디렉터리 밖의 nginx 26 MiB 제한·nginx 자체 413 ProblemDetail, 실제 AWS
  IAM/Block Public Access/암호화/lifecycle·버전 정리, 개인정보 처리방침의 수집·보유 기간 확정은
  별도 소유 경계라 이 계획을 active로 유지한다.
- 2026-08-25: 코드 리뷰에서 찾은 이미지 ID 오류·nullable 계약, JPEG 메타데이터 오인식과 claim
  직전 만료 판정을 보완했다. 배포 nginx에는 이미지 경로의 26 MiB 상한과 413 ProblemDetail을,
  개인정보 처리방침에는 선택적 이미지 항목과 접수일 기준 보유 기간을 반영했다. 실제 AWS
  IAM·버킷 보안·lifecycle 적용과 운영 경로 검증 전까지 계획은 active로 유지한다.
- 2026-08-25: 이미지 디코딩 동시성 상한과 래스터 수명 단축을 적용했다. claim 복구와 저장소
  정리 주기를 분리하고, 고아 이미지 정리의 이미지별 S3 조회를 제거했으며 목록 조회 장애가
  빈 결과로 숨지 않게 했다. 저장 준비 이미지 값을 repository 계약으로 옮겨 의존 방향을
  바로잡았고, 개별 claim 조회·존재 확인·정리 삭제 장애도 스케줄러 오류로 노출한다.
- 2026-08-26: 운영 계정에 lifecycle 설정 권한이 없고 버킷 버전 관리가 비활성화된 조건을
  확인했다. pending·claim·고아 이미지는 기존 애플리케이션 정리가 담당하고, 확정 피드백
  JSON과 최종 이미지는 주 1회 83일 기준으로 수동 삭제해 90일 이내 보유를 집행하기로 했다.
- 2026-08-26: Discord 알림에 첨부 이미지 개수를 추가하고 multipart 배열의 1~5개 제약을
  OpenAPI에 명시했다. 순차 S3 호출이 일반 API의 30초 프록시 제한에 먼저 끊기지 않도록 두
  피드백 쓰기 엔드포인트만 `proxy_read_timeout 180s`를 적용했다.
