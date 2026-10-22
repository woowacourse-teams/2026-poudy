# API 구현 기준 / 이관용 임시 기록

2026-10-21 구현·서버 검증 기준이다. 최종 원천은 Controller·DTO·테스트와
`server/openapi.json`이다. 기존 API를 유지하면서 아래 API를 추가/확장했다. 외부 이관 전 임시 문서다.

## 공통 계약과 코드 위치

- 기존 인증: `security/auth/admin/controller/AdminController.java`, `security/AccessRule.java`.
  `/api/admin/**`는 기존 관리자 세션으로 보호한다. 계정·권한 모델은 추가하지 않는다.
- 페이지: `common/dto/PaginationRequest.java`, `PaginationResponse`와 기존 `items/pagination` 형태를 사용한다.
  page=1, size=20, size 최대 100. 기간은 offset이 있는 ISO-8601 입력과 `[from,to)`를 사용한다.
- 시각은 `OffsetDateTime`, 오류는 `ProblemDetail` + `ErrorCode`다. 요청 검증·오류 계약은
  `exception/GlobalExceptionHandler.java`, `openapi/ErrorResponseCodes.java` 관례를 따른다.
- 새 공개 경로는 읽기 공개 여부와 기존 요청 출처·세션 검사 정책을 확인한다.
- 성공 코드는 조회/공지 갱신 200, 공지 생성 201(+Location), 이미지 업로드 201(Location 없음),
  문의 변경·삭제·복구·조회수 기록 204다. 최종 응답은 생성 OpenAPI를 따른다.
- 모든 `api.zod.*`는 `./gradlew generateApiArtifacts`로 생성하고 Client가 이를 가져온다.

## 문의 통합 관리

기존 원천: `feedback/controller/AdminFeedbackController.java`,
`productrequest/controller/AdminProductRequestController.java`.
기존 경로·요청 구조를 보존하며 두 상태 enum에 `REVIEW_PLANNED`를 추가한다.

| 메서드 | 새 경로                                      | 입력 / 동작                                             |
| ------ | -------------------------------------------- | ------------------------------------------------------- |
| GET    | `/api/admin/inquiries`                       | q, status, type, assigned, from, to, oldest, page, size |
| GET    | `/api/admin/inquiries/summary`               | 보존 데이터의 상태별 수, 오늘 접수 수, 집계 시각        |
| GET    | `/api/admin/inquiries/{kind}/{id}`           | 상세·이미지·담당자·최근 수정                       |
| GET    | `/api/admin/inquiries/{kind}/{id}/neighbors` | 목록과 같은 조건/정렬로 이전·다음 식별자                |
| PATCH  | `/api/admin/inquiries/{kind}/{id}/status`    | `{status}`; 기존 상태와 최근 수정 시각 갱신                  |
| PATCH  | `/api/admin/inquiries/{kind}/{id}/assignee`  | `{assigned: boolean}`                                   |
| PATCH  | `/api/admin/inquiries/status`                | `{targets:[{kind,id}],status}`; 1~100건 원자적 처리     |
| PATCH  | `/api/admin/inquiries/assignee`              | `{targets:[{kind,id}],assigned}`; 1~100건 원자적 처리   |

`kind`는 `FEEDBACK / PRODUCT_CORRECTION / PRODUCT_REGISTRATION`이며 원본 테이블을
명확히 구분한다. 화면의 `type`은 기존 의견 유형에 `PRODUCT_REGISTRATION`을 더한 분류다.
ID는 기존 UUID를 유지한다. 화면 표시용 접수 ID는 별도 업무 번호 체계를 새로 만들지 않고
원본 ID로 식별한다. 검색도 실제 식별자 기준이다.

목록 항목: `kind, id, type, content, productName, brandName, path, status, assigned,
receivedAt, updatedAt`. nullable·필수 필드를 OpenAPI에서 명시한다.
서비스 의견에는 브랜드/제품이 없을 수 있고 제품 등록 요청의 path는 실제 접수 경로가 없으면 null이다.
상세는 `images`를 추가한다. 원본의 제품 연결은 실제 productId에서 만든다.
담당자 이름은 서버가 결정하고 클라이언트 입력으로 받지 않는다.

기존 상태 변경 경로로 변경해도 최근 수정 시각에 반영한다. 모든 변경 경로가 동일한
트랜잭션 책임을 공유해야 한다. 동일 상태는 원본 규칙대로 no-op이다.
목록의 검색/유형/기간/정렬은 UNION으로 결합하기 전에 원본에 적용하거나 결합 후 한 번 적용하며,
각 원본을 따로 페이지 조회해서 합치지 않는다. total·목록·이전/다음은 같은 조건을 사용한다.

## 회원 복구

원천: `user/controller/AdminUserController.java`, `user/service/UserService.java`,
`user/repository/UserRepository.java`, `security/auth/controller/WithdrawnUserController.java`.

| 메서드 | 경로                                        | 입력 / 동작                                                                               |
| ------ | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| GET    | `/api/admin/users/withdrawn`                | email(전체 정확 일치), provider, status, page, size; 현재 탈퇴 회원 + 최근 30일의 회원별 최근 복구 정보 |
| GET    | `/api/admin/users/withdrawn/summary`        | 복구 기간 내 수, 7일 이내 삭제 예정 수                    |
| GET    | `/api/admin/users/{userId}/restore-preview` | 현재 회차·복구 요청·기한·보존 정보 개수                                                   |
| POST   | `/api/admin/users/{userId}/restore`         | 기존 경로/빈 body 유지. 현재 회차의 실제 복구 요청을 서버가 확인하고 연결해 처리          |

기존 `GET /api/admin/users/restore-requests`도 유지한다.
새 목록의 이메일은 maskedEmail만 반환하고 정확 이메일 검색은 DB 조건으로만 사용한다.
반환값 예: `userId, provider, maskedEmail, withdrawnAt, requestedAt, purgeEligibleAt,
restoredAt, status, canRestore`. API가 전체 이메일을 반환해 화면에서만 가리지 않는다.
동일 회원의 재탈퇴는 현재 회차를 우선 표시하고 과거 복구 행으로 잘못 복구하지 않는다.

preview는 실제 선반·평가·위시리스트·필터의 개수와 프로필 존재, 복구 요청 시각을 반환한다.
복구에 필요한 서버 근거는 요청 ID가 없는 기존 구조를 고려해 `(userId, withdrawnAt, requestedAt)`으로
확인하고 복구 기록에 남긴다. 클라이언트가 임의 문의 ID를 보낼 필요가 없다.
확인 모달을 연 뒤 상태가 바뀌었을 수 있으므로 POST에서 요청·기한·탈퇴 상태를 다시 검사한다.
기한 경과·파기·이미 복구된 계정은 일관된 오류로 응답하며 성공처럼 표시하지 않는다.

## 공지 관리와 공개 API

새 `notice` 기능 패키지가 Controller·Service·Domain·Repository를 소유한다.

| 메서드 | 경로                                  | 입력 / 동작                                                     |
| ------ | ------------------------------------- | --------------------------------------------------------------- |
| GET    | `/api/admin/notices`                  | q(제목), status, oldest, page, size                             |
| GET    | `/api/admin/notices/summary`          | 공개/비공개 수, 띠 활성 수와 실제 노출 수                       |
| POST   | `/api/admin/notices`                  | 편집 필드 + status; 비공개 저장 또는 현재 입력값 저장·즉시 공개 |
| GET    | `/api/admin/notices/{id}`             | 초안 포함 편집용 상세. 조회수 증가 없음                         |
| PUT    | `/api/admin/notices/{id}`             | 편집 필드 + status; 내용 저장과 상태 변경을 원자적으로 적용     |
| DELETE | `/api/admin/notices/{id}`             | 비공개만 삭제; 공개 상태면 409                                  |
| POST   | `/api/admin/notices/images`           | multipart images, 관리자 전용 임시 업로드                       |
| GET    | `/api/admin/notices/images/{imageId}` | 관리자 임시/저장 이미지 미리보기                                |
| GET    | `/api/notices`                        | 공개 공지 목록; page/size                                       |
| GET    | `/api/notices/banners`                | 공개·띠 활성 공지 중 최초 공개 시각/id 내림차순 최대 10개       |
| GET    | `/api/notices/{id}`                   | 공개 상세; 비공개/미존재 모두 404                               |
| POST   | `/api/notices/{id}/views`             | 공개 공지 조회수 원자 증가; 비공개/미존재 404                   |
| GET    | `/api/notices/{id}/images/{imageId}`  | 공지 공개 여부·이미지 귀속을 확인한 후 이미지 반환              |

편집 필드: `title, content, bannerEnabled, bannerText, imageIds`.
상태: `PRIVATE / PUBLISHED`. 작성자는 서버에서 `관리자`로 결정하며 body로 받지 않는다.
bannerText는 띠가 꺼지면 보관할 수 있지만 켤 때는 공백 제외 필수·24자 제한을 검사한다.
이미지 ID는 업로드 응답으로 받고 같은 공지의 기존 이미지 또는 만료 전 관리자 pending 이미지만 허용한다.
배열 순서가 표시 순서다. 제목·본문/상태/이미지 연결 변경은 한 트랜잭션으로 적용한다.

상세 응답은 공통 `NoticeResponse`다: `id, title, content, authorName, status, bannerEnabled,
bannerText, firstPublishedAt, createdAt, updatedAt, viewCount, images:[{imageId}]`.
공개 경로는 PUBLISHED인 공지만 반환한다. 비공개 내용·내부 S3 키·버킷 이름은 반환하지 않는다.
띠 응답: `items:[{id,text}]`; 0건이면 사용자 띠를 그리지 않는다.

비공개 전환도 PUT으로 저장한다. 현재 편집값 저장 후 비공개로 바뀌며, 실패하면 기존 공개 상태와
내용이 유지된다. 비공개 전환·삭제와 이미지 열람·조회수 경합은 DB에서 조건을 확인한다.
GET 상세와 조회수 기록을 분리해 Next.js prefetch·관리자 미리보기 때문에 조회수가 늘지 않게 한다.
POST views는 관리자만의 상태 변경이 아니므로 기존 CSRF/출처/요청 제한 정책과 맞춰 보호한다.

## 구현된 추가 계약과 이관 위치

- Controller/DTO: 경로·필드·검증·응답 코드.
- Domain/Service와 테스트: 공개 전환·글자 수·기한·상태·조회수의 실제 규칙.
- Flyway SQL: 컬럼·제약·인덱스·FK·삭제 동작.
- `server/openapi.json`, `common/api.zod.*`: 코드로부터 재생성한 최종 계약.
- 초안에 없던 계약·오류가 생기면 이 문서를 갱신한 뒤 최종 코드 위치와 함께 사용자에게 설명한다.

- `oldest`는 기본 false다. 문의는 접수 시각/ID, 관리자 공지는 생성 시각/ID, 공개 공지는 최초 공개 시각/ID로 안정 정렬한다.
- 문의 summary는 `received,inProgress,reviewPlanned,completed,rejected,today`, neighbors는 `previous,next,position,total`이다.
- 문의 이미지 추가 경로: `GET /api/admin/inquiries/{kind}/{id}/images/{imageId}`. 원본 귀속을 검사한 뒤 no-store로 반환한다.
- 복구 summary는 `available,expiring`, preview는 `account,shelf,ratings,wishlist,filters,profileStored`다.
- 공지 summary는 `published,privateCount,bannerEnabledCount,bannerVisibleCount`이며 실제 노출은 최대10이다.
- 공지 이미지 upload 응답은 `{imageIds:[UUID]}`이고 `images` multipart 필드다. 관리 이미지 URL은 미리보기 전용 세션 보호 경로다.
- 공개 공지와 이미지 응답은 no-store다. 삭제가 아닌 PUT 저장 요청에도 권한·입력값·이미지 귀속을 검사한다.
- 운영 이미지 연동에는 별도 private `POUDY_NOTICE_S3_BUCKET` 설정이 필요하다. 실제 AWS 확인은 남아 있다.

### 검증 보강에 따른 내부 보정

요청/응답 구조와 HTTP 경로는 바꾸지 않았다. 정확히 7일 남은 복구 계정의 응답을 검색 조건과
같은 EXPIRING으로 맞췄다. 문의 최근 수정 시각은 V37에서도 실제 변경 순서를 유지한다.
공지 업로드의 pending 기록을 S3 쓰기보다 먼저 저장해 업로드/보상 삭제 동시 실패도 정리할 수 있다.
클라이언트에 실패한 업로드의 이미지 ID를 반환하거나 실패한 공개 저장을 성공으로 표시하지 않는다.
