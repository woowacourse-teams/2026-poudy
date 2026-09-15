# 관리자 피드백·제품 등록 요청 관리 API 구현 계획

## 상태

- 상태: **완료**
- 시작일: 2026-09-15
- 추적 이슈: [#448](https://github.com/woowacourse-teams/2026-poudy/issues/448)

## 범위

관리자 화면에서 피드백과 제품 등록 요청을 목록·상세 조회하고 처리 상태를 변경한다.
관리자 인증과 세션·토큰 관리는 이번 작업에서 제외한다.

```text
GET   /api/admin/feedbacks?status=&type=&page=&size=
GET   /api/admin/feedbacks/{feedbackId}
PATCH /api/admin/feedbacks/{feedbackId}/status

GET   /api/admin/product-requests?status=&page=&size=
GET   /api/admin/product-requests/{requestId}
PATCH /api/admin/product-requests/{requestId}/status
```

- 상태는 `RECEIVED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`다.
- `statusChangedAt`은 최근 상태 변경 시각이다.
- `completedAt`은 `COMPLETED` 진입 시각이며 다른 상태로 바뀌면 비운다.
- 같은 상태로의 변경은 시각과 저장 문서를 바꾸지 않는다.
- 기존 관리 필드가 없는 S3 문서는 `RECEIVED`와 최초 접수 시각으로 보정한다.
- 피드백 상태는 원본 `feedback.json`의 보존 기간을 바꾸지 않도록 별도 `management.json`에 저장한다.
- 신규 제품 요청은 기존 v1 문서로 저장하고, 첫 상태 변경 시 관리 필드를 포함한 v2로 승격한다.
- 목록은 상태로 필터링하며, 피드백은 `BUG_REPORT`, `IMPROVEMENT`, `OTHER`,
  `PRODUCT_CORRECTION` 대상 유형 필터도 지원한다.
- 제품 정보 정정 요청은 피드백 관리 응답에서 `productId`, `productName`으로 대상을 제공하고,
  일반 서비스 의견은 nullable `path`로 접수 화면을 제공한다.
- 상태 필터를 생략하면 완료·반려를 포함한 전체 항목을 반환해 처리된 요청도 관리 화면에서 다시 볼 수 있다.
- 목록은 접수 시각과 ID 내림차순으로 정렬한 뒤 기존 페이지 계약을 적용한다.
- soft delete, 전체 상태 변경 이력, 처리 담당자, 처리 메모, 동시성 version 관리는 제외한다.

## 검증

- 상태 변경과 완료 시각 도메인 테스트
- 기존 S3 JSON 호환, 목록 필터·정렬, 상태 저장 테스트
- 목록·상세·상태 변경 HTTP 계약 테스트
- 기존 공개 접수 API 회귀 테스트
- `./gradlew test --tests 'com.poudy.feedback.*' --tests 'com.poudy.productrequest.*' --tests 'com.poudy.config.CorsConfigTest'` 통과
- `sh ./scripts/verify.sh` 통과
