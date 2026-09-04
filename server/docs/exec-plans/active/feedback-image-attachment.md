# 사용자 의견 이미지 첨부 구현 계획

## 상태

- 상태: **활성 계획**
- 시작일: 2026-08-24
- 추적 이슈: [#212 사용자 의견 이미지 첨부 지원](https://github.com/woowacourse-teams/2026-poudy/issues/212)
- 관련 이슈: [#206 의견 등록 API 구현](https://github.com/woowacourse-teams/2026-poudy/issues/206), [#388 HEIC 지원](https://github.com/woowacourse-teams/2026-poudy/issues/388)
- 소유 도메인: `feedback`

서버 구현은 끝났고, 이 문서는 실제 AWS 보안·IAM 검증과 보유 기간 집행 같은 남은
운영 작업을 추적하기 위해 active로 둔다. 현재 동작의 권위 원천은 `FeedbackController`,
`FeedbackImageProcessor`, `S3FeedbackRepository`, `S3FeedbackImageRepository`, 테스트와
생성된 OpenAPI 문서다.

## 목표와 범위

기존 `POST /api/feedback`의 JSON 계약과 `204 No Content`를 깨지 않으면서 선택적인 이미지
1~5장을 첨부한다. 이미지는 서버가 검증하고 재인코딩한 결과만 S3에 비공개·암호화
상태로 저장하며 원본 바이트, 원본 파일명과 저장소 URL을 보존하거나 노출하지 않는다.

현재 범위는 다음과 같다.

- 기존 2단계 API와 일회성 `imageIds`
- JPEG, PNG, HEIC 실제 디코딩과 픽셀 정규화
- S3 pending, 최소 claim, final image, `feedback.json` commit 경계
- 업로드 전용 요청 제한과 디코딩 동시성 상한
- 만료 pending과 오래된 claim의 멱등적 조정
- 피드백 JSON의 첨부 목록과 Discord 알림의 첨부 개수

다음은 이 서버 구현과 분리한 운영 범위다.

- AWS 버킷·IAM의 Public Access Block, 암호화와 최소 객체 권한 적용
- lifecycle 권한이 없는 버킷의 수동 보유 기간 집행과 개인정보 처리방침 일치 확인
- 실제 백엔드 호스트의 HEIC 변환과 배포판 보안 업데이트 검증
- 백엔드 `8080`의 외부 직접 접근 차단은 개발 단계에서 보류한다. 이번 변경의 범위와
  완료 조건에 포함하지 않는다.

## API 계약

이미지 저장 프로토콜을 단순화해도 외부 API는 바꾸지 않는다.

### 이미지 업로드

`POST /api/feedback/images`는 `multipart/form-data`의 반복 파트 `images`를 1~5개 받는다.
성공은 정규화한 임시 S3 객체가 모두 저장된 상태를 뜻하며 `201 Created`를 반환한다.

```json
{
  "imageIds": [
    "8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf"
  ]
}
```

- `imageIds`는 요청 파트 순서와 같은 일회성 UUID 목록이다.
- 응답에는 확장자, 파일명, S3 키와 URL을 싣지 않는다.
- 한 파일이라도 실패하면 이 배치에서 이미 저장한 pending을 정리하고 ID를 반환하지 않는다.
- 의견 등록 없이 업로드만 반복하는 비용 남용을 줄이기 위해 별도 요청 제한을 적용한다.

### 의견 등록

`POST /api/feedback`는 기존 요청에 선택 필드 `imageIds`를 받는다.

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
- 최대 5개며 중복 ID는 외부 저장소 호출 전에 거절한다.
- 형식 오류, 미존재, 24시간 만료, 이미 claim·소비된 ID는 구분해 노출하지 않고 같은
  `400 INVALID_FEEDBACK_IMAGE_ID`로 반환한다.
- 성공은 이미지 유무와 관계없이 기존과 같은 `204 No Content`다.

이미지 내용·개수·크기 위반은 `400 INVALID_FEEDBACK_IMAGE`, 요청 본문 상한 초과는
`413 PAYLOAD_TOO_LARGE`, 이미지 처리 슬롯 부족은 `429 TOO_MANY_REQUESTS`를 사용한다.

## 비례적인 이미지 검증 경계

서버는 이 기능의 실제 위험인 파싱 오류, 디코딩 자원 고갈과 원본 메타데이터 저장을 막는다.
재인코딩으로 어차피 사라질 컨테이너 표식을 중복 수동 파싱해 입력을 더 좁게 만들지 않는다.

디코딩 전에 다음 상한을 적용한다.

- 파일별 5 MiB
- 파일 수 1~5개로 보장되는 최대 파일 합계 25 MiB
- multipart 오버헤드를 포함한 요청 전체 26 MiB
- 각 축 4,096px, 총 16,000,000px

`FeedbackImageProcessor`는 파일명, 확장자와 선언된 Content-Type을 판정에 사용하지 않는다.

1. 실제로 읽은 바이트에도 5 MiB 상한을 다시 적용한다.
2. JPEG SOI, PNG 8바이트 시그니처, ISO BMFF `ftyp`의 `heic`/`heix` brand 중 하나를
   확인한다. AVIF 같은 다른 ISO BMFF 형식을 HEIC로 오인하지 않는다.
3. JPEG/PNG는 ImageIO reader의 실제 format을 확인하고, HEIC는 `heif-convert`
   런타임으로 실제 디코딩한다. HEIC 디코더가 만든 JPEG가 정확히 하나일 때만
   그 결과를 ImageIO가 JPEG로 다시 읽는다.
4. 픽셀 할당 전에 width·height·총 픽셀 상한을 확인하고 기본 프레임을 끝까지 디코딩한다.
5. 픽셀만 새 `BufferedImage`로 옮겨 JPEG는 RGB JPEG, PNG는 RGBA PNG로 재인코딩한다.
   HEIC는 JPEG로 저장한다. writer에 원본 metadata를 전달하지 않아 EXIF, ICC, 텍스트,
   썸네일과 디코더가 무시한 꼬리 데이터를 저장 결과에서 제거한다.
6. 재인코딩 결과에도 5 MiB 상한을 적용한다.

JPEG/PNG의 다중 프레임 표식, reader warning, 두 번째 JPEG 표식이나 이미지 뒤 꼬리 데이터는
별도 보안 경계가 아니다. 이를 수동으로 파싱해 입력 전체를 거절하지 않고, 실제 디코더가 반환한 기본
프레임을 재인코딩해 안전한 단일 이미지로 평탄화한다. HEIC 컨테이너도 프레임 수를 애플리케이션이
수동 파싱하지는 않지만, 현재 외부 디코더가 JPEG를 여러 개 만들면 단일 결과 계약에 맞지 않아 거절한다.

이미지 처리 permit은 디코딩과 재인코딩을 포함한 `FeedbackImageProcessor.process`에만 적용한다.
S3 pending 저장과 삭제를 기다리는 동안에는 슬롯을 점유하지 않는다. 슬롯이 없으면 대기열을
쌓지 않고 429로 거절한다.

## S3 상태와 최소 프로토콜

```text
poudy/feedback/pending/{imageId}.jpg|png
poudy/feedback/claims/{imageId}.json
poudy/feedback/{feedbackId}/images/{imageId}.jpg|png
poudy/feedback/{feedbackId}/feedback.json
```

- pending은 새 UUID로 한 번의 `If-None-Match: *` 조건부 put을 수행한다. 애플리케이션 재시도
  루프를 두지 않는다.
- pending의 `Last-Modified + 24h`를 논리적 만료 시각으로 사용하며, claim 직전에도 다시
  확인한다.
- UUID만 받은 저장소는 `.jpg`와 `.png`를 조회해 정확히 하나만 존재할 때 format을
  확정한다.
- claim은 `If-None-Match: *`로 한 imageId의 소유권을 직렬화한다. 본문은
  `feedbackId`와 정규화된 `extension`만 가지며 source ETag, claim 시각과 JSON hash를 영속화하지
  않는다.
- 여러 ID는 UUID 정렬 순서로 claim해 교차 배치 충돌을 빠르게 끝낸다. 최종 JSON의 이미지
  순서는 클라이언트가 보낸 순서를 유지한다.
- 최종 복사는 조회한 pending의 ETag를 source 조건으로만 사용하고 같은 원본으로 재실행해도
  같은 결과를 낸다. final 대상 키에는 추가 조건부 put 의미를 부여하지 않는다.
- 피드백 JSON은 UUID로 생성한 정확한 `poudy/feedback/{feedbackId}/feedback.json` 키에
  `If-None-Match: *`로 저장한다. 저장 응답이 유실됐을 때는 이 키의 정확한 존재만
  확인한다. 고유 UUID와 조건부 생성이 다른 피드백 문서의 충돌을 막으므로 내용 hash 비교는
  필요하지 않다.
- 모든 put과 copy는 `AES256` 서버 측 암호화를 명시하고 ACL과 공개 URL을 만들지 않는다.

이미지가 있는 의견 등록 순서는 다음과 같다.

```text
요청·중복 검증 → feedbackId 생성 → 요청 제한
  → pending 존재·만료 확인 → 모든 imageId 조건부 claim
  → 최종 경로로 멱등 복사
  → images를 포함한 feedback.json 저장  ← commit point
  → pending 삭제 → claim 삭제 → Discord 알림
```

- claim이나 복사 중 실패하면 final을 먼저 지운 뒤 해당 claim을 지우고 pending은 만료 전
  재사용할 수 있게 남긴다.
- JSON 저장이 확정 실패하면 같은 rollback을 수행한다. 정확한 JSON 키의 존재를 확인할 수
  없으면 final과 claim을 보존하고 오래된 claim 조정에 넘긴다.
- JSON 저장 후 pending·claim 정리만 실패하면 접수를 실패시키지 않고 claim을 남겨 조정기가
  완료하게 한다.
- 10분보다 오래된 claim만 조정한다. 정확한 UUID `feedback.json` 키가 존재하면 pending 삭제
  후 claim을 지우고, 부재가 확인되면 final 삭제 후 claim을 지운다. 존재 조회가 권한·통신
  오류로 불명확하면 삭제하지 않고 다음 주기로 넘긴다.
- 별도 정리 작업은 24시간이 지난 pending 중 진행 중 claim이 없는 객체만 지운다.

일회성 claim을 모든 final 복사 전에 생성하고 claim을 마지막에 지우므로, 전체 final prefix를
훑는 고아 스캔은 필요하지 않다. 조정 결정에는 JSON hash나 구조 변경 전 legacy 키를 사용하지
않는다. 이 단순한 프로토콜이 API의 일회성 ID와 부분 실패 안전성을 유지한다.

## HEIC 런타임·라이선스 경계

HEIC는 호스트의 `/usr/bin/prlimit`과 `/usr/bin/heif-convert`를 별도 프로세스로 호출한다.
프로세스에는 384 MiB 주소 공간, 32 MiB 출력 파일, 15초 CPU·실행 시간 상한을 두고
자식 환경 변수를 모두 제거한다. 원본과 중간 JPEG는 요청별 임시 디렉터리에만 쓰고 항상 삭제한다.

`bootstrap-backend.sh`는 Amazon Linux의 `libheif-tools`, `libde265`, `util-linux-core`를
설치하고 필요한 실행 파일을 확인한다. 운영 호스트에서는 다음을 확인해야 한다.

1. 배포판 보안 공지, RPM changelog 또는 빌드 기록으로 현재 패키지에 필요한 보안 수정이
   backport되었는지 확인한다. 배포판은 상위 버전 문자열을 유지하고 수정을 역이식할 수 있으므로
   upstream semver만으로 승인 여부를 판단하지 않는다.
2. `/usr/bin/prlimit`과 `/usr/bin/heif-convert`가 일반 파일이고 백엔드 실행 계정에서 실행
   가능한지 확인한다.
3. OS 패키지가 제공하는 `libheif`·`libde265` LGPL 라이선스 고지와 소스 제공 경로를
   보존한다. 애플리케이션은 해당 바이너리를 번들하거나 링크하지 않고 OS 실행 파일로만 호출한다.
4. LGPL 등 오픈소스 라이선스는 HEVC/H.265 특허권을 허여하지 않는다. 서비스 국가,
   제공 방식과 사업 범위에 따른 특허 의무는 조직의 법무·정책 확인을 별도로 받는다.

두 실행 파일을 사용할 수 없으면 HEIC 입력만 거절하며 애플리케이션, JPEG와 PNG 업로드는
정상 동작한다.

## 피드백 JSON, 로그와 보유

피드백 JSON은 요청 순서대로 `imageId`와 저장 `extension`을 담는다. 이미지가 없는 기존
요청도 `images: []`를 저장한다. Discord에는 이미지 바이트나 URL 대신 첨부 개수만 추가하며,
`allowed_mentions.parse=[]`를 유지한다.

애플리케이션 로그에는 의견 content/path, 원본·재인코딩 바이트, 원본 파일명, `imageId`,
S3 키와 URL을 남기지 않는다. 보상·정리 실패는 작업 종류, `feedbackId`, 개수와 예외
유형처럼 객체 키를 포함하지 않는 진단값만 기록한다.

현재 운영 버킷은 버전 관리가 비활성화되어 있고 lifecycle 설정 권한이 없다. 애플리케이션은
확정 접수 전의 pending·claim만 정리한다. 접수된 `feedback.json`과 최종 이미지는 운영자가
최소 주 1회, `feedback.json` Last-Modified 83일 기준으로 삭제해 접수일로부터 90일을 넘지 않게
한다. 상세 절차는 `deploy/README.md`가 권위 원천이다.

## 남은 운영 검증

- 실제 EC2 인스턴스 역할로 pending·claim 목록, exact feedback JSON 존재 확인, put/get/copy/delete가
  필요한 prefix에서만 동작하는지 확인한다. `AccessDenied`를 부재로 오인하지 않는다.
- 버킷의 Block Public Access, HTTPS 강제, 기본 암호화와 요청의 SSE-S3가 일치하는지 확인한다.
- 팀이 직접 촬영한 HEIC로 Amazon Linux 호스트의 변환, 타임아웃, 임시 파일 정리를
  확인한다. 외부 라이선스의 HEIC fixture는 저장소에 추가하지 않는다.
- 수동 83일 삭제 절차가 피드백 JSON·이미지를 모두 지우고 개인정보 처리방침의
  90일 이내 보유 표현과 일치하는지 확인한다.
- 운영 경로에서 1~5장 업로드, 26 MiB/413, 429와 최대 처리 시간을 실측한다.

## 테스트와 검증 기준

- JPEG/PNG의 시그니처·실제 reader, 크기·픽셀·완전 디코딩, 메타데이터 없는 재인코딩과
  입력·출력 크기 상한
- HEIC `heic`/`heix` 식별, HEIC가 아닌 ISO BMFF 거절, JPEG 정규화, 실행 파일 확인,
  빈 자식 환경과 자원 상한
- 0개·6개·5 MiB 초과 거절, 파트 순서, 배치 중간 실패 정리와 S3 저장 중 permit 해제
- pending 단일 조건부 put, 최소 claim 문서, 동시 claim, 멱등 final copy와 부분 실패 보상
- 정확한 UUID JSON 키로 저장 응답 유실 판정, 불명확한 결과 보존, 오래된 claim의
  commit·rollback 조정, claim 없는 만료 pending 정리
- MockMvc와 실제 embedded server의 201/204/400/413/429/500 `ProblemDetail` 계약
- Controller·DTO를 권위 원천으로 생성한 OpenAPI·Zod 드리프트 부재
- `sh ./scripts/test.sh` 후 `sh ./scripts/verify.sh` 통과

## 진행 기록

- 2026-08-24: 이슈와 피드백·S3·오류·생성물·배포 경계를 조사하고 최초 구현 계획을 작성했다.
- 2026-08-24: 이미지 업로드·검증·재인코딩, pending/claim/commit, 선택적 `imageIds`,
  별도 업로드 요청 제한과 정기 정리를 구현했다.
- 2026-08-25: 이미지 ID 오류·nullable 계약, JPEG 메타데이터, claim 직전 만료 판정,
  디코딩 동시성, nginx 26 MiB/413과 개인정보 보유 표현을 보완했다.
- 2026-08-26: lifecycle 권한이 없고 버킷 버전 관리가 비활성화된 조건에서 주 1회 83일
  기준 수동 삭제로 90일 이내 보유를 집행하기로 했다.
- 2026-08-26: Discord 첨부 개수와 multipart 1~5개 OpenAPI 제약, 피드백 쓰기 경로의
  `proxy_read_timeout 180s`를 반영했다.
- 2026-09-04: 외부 2단계 API는 유지하면서 HEIC 입력을 추가했다. 피드백 이미지의
  실제 위험에 비례하게 검증과 S3 프로토콜을 재검토해 다중 프레임·warning·꼬리 데이터
  수동 거절, JSON hash·legacy 조회·final prefix sweep과 애플리케이션 재시도 루프를
  제거했다. 이미지 permit은 디코딩·재인코딩에만 적용했다.
- 2026-09-04: HEIC 런타임의 배포판 보안 공지·backport, OS 패키지의 LGPL 의무와 HEVC 특허
  정책을 검토했다. 백엔드 8080 외부 접근 차단은 개발 단계 운영 작업으로 보류했다.
- 2026-09-05: 별도 승인 설정은 불필요해 제거하고, 백엔드 bootstrap이 Amazon Linux의 HEIC
  런타임 패키지를 설치하고 실행 파일을 검증하도록 변경했다.
