# 제품 정보 정정 요청 분리와 피드백 계약 정리 (#446)

- 소유 도메인: `feedback`
- 연관 경계: `product`(제품 존재 확인), `deploy/nginx`

## 목표와 범위

접수된 피드백이 없고 모바일 앱은 WebView 셸이므로, 서버·웹·nginx를 함께 배포하는 조건에서
하위 호환 없이 계약을 바꾼다.

- 제품 정보 정정 요청을 `POST /api/products/{productId}/correction-requests`로 분리하고
  `FeedbackType.DATA_CORRECTION`을 제거한다.
- 의견 등록 경로를 `POST /api/feedbacks`로 바꿔 다른 컬렉션 경로와 같은 복수형으로 맞춘다.
- 제품 등록 요청을 `POST /api/products/registration-requests`로 옮겨 제품 정보 정정 요청과 함께
  제품 컬렉션 아래에 둔다. S3 저장 prefix `product-requests`는 URL과 무관하므로 바꾸지 않는다.
- `POST /api/feedbacks`의 `path`를 선택 필드로 바꾸고, 없으면 `null`로 저장하고 알림에는
  `알 수 없음`으로 표시한다.
- 이미지 업로드는 `POST /api/pending-images`를 사용한다.

client는 같은 브랜치에서 새 계약에 맞춘다. 정정 화면은 `requestProductCorrection`으로 보내고,
`toOriginPath`는 알 수 없는 경로를 `/`로 채우지 않는다. 처리방침의 "문의를 연 화면의 주소" 문구는
수집될 때만 저장한다는 사실과 어긋나지 않으므로 바꾸지 않는다.

## 설계

- 요청 대상을 `FeedbackSubject`로 표현한다. `ServiceFeedback`은 유형과 선택 화면 경로를,
  `ProductCorrection`은 제품 ID와 접수 시점의 제품명을 가진다.
- 정정 요청은 새 기능 패키지로 만들지 않는다. 내용 검증, 요청 제한, S3 저장, 이미지
  claim·copy·commit, 정리 스케줄러와 Discord 알림이 의견과 모두 같다. 이슈에 적은 "S3 claim
  경계의 `feedbackId` 결합 해소"는 정정 요청이 같은 접수 ID·키 형식을 쓰면 필요 없으므로 하지
  않는다. S3 키, IAM prefix와 보유 기간 운영 절차도 바뀌지 않는다.
- Service가 제품을 조회하고, 없으면 요청 제한을 소비하기 전에 `PRODUCT_NOT_FOUND`로 거절한다.
- S3 문서의 `type`은 서비스 의견이면 유형 이름, 정정 요청이면 `PRODUCT_CORRECTION`이다.
  정정 요청은 `path` 대신 `productId`, `productName`을 저장한다.
- nginx의 `location ^~ /api/`는 바깥 정규식 location 탐색을 막으므로, 정정 요청의 180초
  timeout은 그 안쪽 정규식 location으로 준다.

## 검증

- 도메인: 알 수 없는 경로, 공백·초과 경로 거절, 정정 대상 보유
- Service: 경로 없는 접수, 정정 요청 저장·알림 순서, 없는 제품의 요청 제한·저장 생략
- 저장소: `path: null`, 정정 요청 문서 필드
- 알림: `화면: 알 수 없음`, 대상 제품 표시
- API: 경로 없는 204, 공백 경로·`DATA_CORRECTION`·짧은 내용 400, 없는 제품 404,
  잘못된 제품 ID 400, OpenAPI 경로·오류 응답
- `sh ./scripts/verify.sh`

## 진행

- 서버 구현, 테스트, nginx 설정 반영
- 2026-09-14 `sh ./scripts/verify.sh` 통과. `./gradlew test --rerun`으로 899개 테스트를 다시
  실행해 실패·오류·건너뜀 0을 확인했다. OpenAPI와 `common/api.zod.*`를 재생성했다.
- nginx 설정은 로컬에 nginx가 없어 `nginx -t`로 검증하지 못했다. 배포 전 확인이 필요하다.
- client 전송 코드·mock·테스트·SPEC 반영
- 남은 일: nginx 문법 확인, 서버·웹·nginx 동시 배포
