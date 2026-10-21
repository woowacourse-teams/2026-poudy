# 관리자 화면 개편·공지사항 실행 계획

- 작성일: 2026-10-21
- 상태: 구현·서버/Client 검증·실제 서버/DB 브라우저 검증 완료. PR 검토 준비 완료. 배포·실제 S3 연동·외부 문서 이관은 미완료.
- 검토 PR: [API #877](https://github.com/woowacourse-teams/2026-poudy/pull/877) → [화면 #878](https://github.com/woowacourse-teams/2026-poudy/pull/878). 두 PR은 draft이며 미병합이다.
- 추적 이슈: [#868](https://github.com/woowacourse-teams/2026-poudy/issues/868).
- 문서 성격: 작업 중 사용하는 임시 기록. 최종 계약은 코드·테스트로 검증한 뒤 팀 Notion·ERD Cloud로 옮긴다.
- 연결: [요구사항](spec.md), [API 초안](api.md), [데이터 설계 초안](schema.md).

## 확인한 기준과 작업 환경

구현은 최신 `origin/dev`의 `1134f651`에서 만든 `feat/868-admin-notices` 브랜치와
별도 worktree `/private/tmp/poudy-admin-868`에서 진행했다. PR 준비 시
최신 `origin/dev`의 `755567d3`로 rebase했고, 겹치는 공통 아이콘 변경을 포함해 Client 검사를 다시 통과했다. 원래 checkout의 `dev`는
이동·reset하지 않았다. 작업 결과는 팀 저장소의 기능 브랜치와 PR로 보존한다.

기존 사용자의 미커밋 작업인 아래 파일은 이 작업에 포함하거나 수정하지 않는다.

- `deploy/codedeploy/README.md`
- `deploy/codedeploy/frontend/scripts/validate-service.sh`
- `docs/deploy/build-cache-optimization.md`

검증은 Node 22·pnpm 11.21.0·Java 21·PostgreSQL 18을 사용했다. Docker의 로컬
테스트 DB와 브라우저용 DB를 분리했다. 운영 DB나 실제 회원은 사용하지 않았다.
비밀값을 문서·이슈·출력에 복사하지 않는다.

## 코드와 협업 관례

- 가까운 `AGENTS.md`를 먼저 읽는다. 서버는 `ARCHITECTURE.md`·제품 맥락·관련 구현도 확인한다.
- 서버는 기능별 Controller → Service → Domain, JDBC Repository 구조를 따른다. Domain에 HTTP·DB·Swagger 의존을 넣지 않는다.
- 기존 Flyway 파일은 수정하지 않고 최신 버전을 확인한 후 새 버전으로 추가한다.
- Controller·DTO·OpenAPI 설정이 API 계약의 원천이다. `server/openapi.json`, `common/api.zod.ts`,
  `common/api.zod.types.d.ts`는 생성물이며 직접 편집하지 않는다.
- Client는 `type`, `readonly`, 경계에서 Zod 검증을 사용하고 API 타입을 중복 작성하지 않는다.
- 코드 작성 전에 설치된 Next.js의 관련 로컬 가이드를 읽는다.
- 색·서체·형태는 `design-system/tokens.json`, 화면 구성은 사용자가 첨부한 이미지가 기준이다.
  `.pen` 원본은 현재 checkout과 원격 트리에서 찾지 못했고 Pencil 연결도 실패했다.
- 최신 원격에는 Icon·Dropdown·ImageAttachment·Toast·EmptyState·ErrorState 등 공통 부품이
  추가되어 있다. 로컬의 옛 부품을 기준으로 재구현하지 않는다.
- #722는 관리자 체계를 명시적으로 제외한다. 앱용 부품에 관리자 색·크기를 강제로 덮어쓰지 않고,
  공통 동작을 재사용하며 관리자 체계의 변형 또는 관리자 공용 부품을 필요한 만큼만 추가한다.
- 이슈는 기존 feature 템플릿의 영역·작업 내용·체크리스트를 따른다. 관련 작업 #722, #741,
  #765, #437과 중복하지 않는다. 특히 제품 등록 요청 사진·승인·선반 반영은 #765의 범위다.
- 기능 브랜치는 `feat/<issue>-<slug>`, PR 대상은 `dev`로 한다. 이것은 최근 PR 사례를 바탕으로
  이번 작업에 선택한 방식이며 저장소 전체의 강제 규칙으로 간주하지 않는다.
- 완료 단위별 PR에 해당 이슈의 `Close #번호`를 적는다. 병합·실제 종료 상태 확인 전에는 이슈를 수동 종료하지 않는다. 부분 완료는 `Ref #번호`를 쓴다.
  `dev`는 기본 브랜치가 아닐 수 있으므로 머지 뒤 실제 종료 상태를 확인한다.
- 커밋을 생성하는 시점에만 `CONTRIBUTING.md`의 커밋 규칙을 읽고 적용한다.

## 작업 분할과 순서

| 순서 | 작업                                                    | 의존    | 완료 증거                                               | 이슈                                                               |
| ---- | ------------------------------------------------------- | ------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| 1    | 관리자 토큰·공통 레이아웃·재사용 부품                   | 없음    | 토큰 생성·린트, 사이드바·표·모달·서랍 미리보기          | [#869](https://github.com/woowacourse-teams/2026-poudy/issues/869) |
| 2    | 문의 통합 조회·검토 예정·담당자·메모·이력·일괄 처리 API | 없음    | 기존 접수/관리 API 회귀, 혼합 유형·동시성·보관기간 검사 | [#870](https://github.com/woowacourse-teams/2026-poudy/issues/870) |
| 3    | 회원 복구 목록·근거·복구 정보·운영 집계 API             | 없음    | 요청 없는 복구 거절, 기한·파기 경합·재탈퇴 검사         | [#871](https://github.com/woowacourse-teams/2026-poudy/issues/871) |
| 4    | 공지 도메인·이미지·공개 API·관리 API                    | 없음    | 비공개 접근 차단·원자적 공개·이미지 권한·조회수 검사    | [#872](https://github.com/woowacourse-teams/2026-poudy/issues/872) |
| 5    | 문의·회원 복구 관리자 화면 개편                         | 1, 2, 3 | 디자인 대조·필터·일괄 처리·모달·실제 서버 연동          | [#873](https://github.com/woowacourse-teams/2026-poudy/issues/873) |
| 6    | 공지 관리자·사용자 목록/상세·상단 띠                    | 1, 4    | 편집/미리보기·이미지·링크·10개/5초·세션 닫기 검증       | [#874](https://github.com/woowacourse-teams/2026-poudy/issues/874) |
| 7    | 통합 검증·이관·임시 기록 정리                           | 1~6     | CI·브라우저 증거·Notion/ERD Cloud 이관 확인             | [#875](https://github.com/woowacourse-teams/2026-poudy/issues/875) |

위 순서는 논리적 의존 관계이며 별도 에이전트나 동시 구현을 전제하지 않는다.
단계별로 생성 타입과 실제 서버 동작을 먼저 맞춘 뒤 소비 화면을 연결한다. 기존 API는 새 화면
전환 동안 유지하며, 화면이 이전되어도 이번 범위에서 별도 삭제 작업을 추가하지 않는다.

## 검증 계획

1. 구현 직전 최신 dev의 규칙·관련 이슈·DB 버전을 확인하고, 별도 기능 브랜치에서 기준 검사를 실행한다.
2. 서버 동작 변경마다 도메인·HTTP 계약·PostgreSQL 통합 테스트를 추가한다. 고정 Clock으로
   공개일·오늘·이달·30일 경계를 검증한다. 원본 갱신과 이력 기록은 한 트랜잭션인지 검사한다.
3. 서버는 `sh ./scripts/test.sh`, 계약 생성 후 `sh ./scripts/verify.sh`를 통과시킨다.
   생성물 드리프트로 실패하면 갱신 diff를 확인하고 다시 검증한다.
4. Client는 `pnpm --dir client check`, 디자인 시스템의 `typecheck`, `tokens:check`, `test`,
   `exceptions:check` 및 변경한 부품의 Storybook 빌드/검사를 최신 package scripts에 맞춰 실행한다.
5. 실제 서버·DB로 관리자 로그인 → 문의 변경·메모·복구 → 공지 작성·이미지 저장·게시 →
   사용자 목록·상세·띠 → 비공개 전환을 확인한다. MSW 성공 화면만으로 완료 처리하지 않는다.
6. 첨부 이미지 크기 1801×1376과 일반 데스크톱 1440×900에서 관리자 화면을 비교한다.
   좁은 관리자 화면에서는 표 가로 스크롤·서랍/모달 접근을 확인한다. 사용자 화면은 320·390 폭,
   키보드·포커스·200% 글자 확대·줄바꿈·링크·이미지 실패를 확인한다.
7. PR에 실행한 명령·결과·스크린샷·미실행 항목과 이유를 남긴다. 검증을 우회하거나 기준을 낮추지 않는다.

## 문서 수명과 완료 조건

- API·스키마의 경로·필드는 구현 전 초안이다. 구현에서 달라지면 코드/테스트 기준으로 갱신한다.
- 개별 구현 이슈는 해당 기능의 완료·검증 후 닫고, 상위 이슈와 정리 이슈는 모든 검증·이관 후 닫는다.
- 팀 Notion에는 확정 정책·API 계약·운영 제약, ERD Cloud에는 실제 적용 스키마를 옮긴다.
  이관 대상 위치와 최종 링크는 사용자에게 받아 기록하며, 사용자가 직접 이관한 경우 확인으로 갈음한다.
- 이관 전에 이 폴더를 삭제하지 않는다. 이관 완료 확인 후 네 문서를 제거하고 생성 코드·테스트만 남긴다.
- 코드로 설명되지 않는 지속적 제약만 기존 아키텍처 문서에 최소한으로 반영한다.
- 체크리스트 완료만으로 기능이 구현되거나 검증된 것으로 표시하지 않는다.

## 구현과 검증 결과

- 서버: `sh ./scripts/verify.sh` 통과. PostgreSQL 통합 검사를 포함한 1,521개 테스트 성공,
  Checkstyle/Spotless·OpenAPI/Zod 재생성 드리프트 검사 통과. 로그: `/private/tmp/poudy-admin-boundaries-verify.log`.
- Client: ESLint 오류 0(기존 경고 265), Prettier·라우트 타입 생성·TypeScript 통과.
  173개 파일 1,515개 테스트 및 프로덕션 빌드 통과. 테스트에는 로컬 브라우저용 URL 환경값을
  전달하지 않고, 빌드에만 로컬 서버 주소를 지정했다.
- 문의: 혼합 원본 통합, 기존 상태 변경의 이력, no-op, 메모·담당·일괄 처리 원자성,
  중복 대상 제거·5개 상태 반복 변경/no-op, 없는 대상 롤백, 21번째 항목으로 페이지를 넘는 이전/다음과 CASCADE를 검증했다.
- 추가 동시성 검사: 복구 2건 중 1건만 성공·집계, 재탈퇴 후 새 요청 필요, 기간 경과 복구/삭제 경합,
  파기 집계 중복 방지와 회차 CASCADE, 동시 조회수 10건 누락 없음, DB 띠 null 차단을 검증했다.
- 복구: 기존 요청 근거·보관기한·회차/집계·실제 보존 데이터 개수와 복구 후 상태를 검증했다.
- 공지: 공개/비공개 접근, 조회수 분리, 최초 공개일·글자 수, 11건 중 10개 띠,
  이미지 업로드/귀속/비공개 차단을 MVC+DB 통합 테스트로 확인했다.
- 이미지 테스트는 S3 SDK 경계만 mock이며 실제 이미지 처리기와 DB를 사용한다.
  실제 AWS 버킷 업로드/읽기/정리·권한/공개 차단은 아직 검증하지 않았다.
- 실제 브라우저: `pnpm --dir client verify:admin`, `verify:admin-operations` 통과.
  로그인→문의 단건/일괄 처리·메모 유지→요청 근거 복구→공지 생성/공개→사용자 목록/상세/띠→
  탭 닫기 유지→비공개→Escape로 삭제 모달 닫기/포커스 복원→Enter로 다시 열기/삭제까지 확인했고 `pageerror`는 없었다.
- 1801×1376·1440×900, 모바일 390·320 폭과 200% 글자 확대를 확인했다.
  관리자 좁은 표는 가로 스크롤하며, 320 폭의 공지 본문·긴 URL은 가로 넘침 없이 줄바꿈한다.
- 브라우저 검증으로 발견한 ‘담당/상태 갱신 시 작성 중 메모 초기화’와 ‘최초 저장 뒤 라우팅
  지연 중 다시 저장하면 중복 생성’은 원인 수정과 재검증을 완료했다.
- 디자인 시스템: 토큰 생성/테스트·타입·예외 검사·Storybook 빌드 통과. 기존 토큰을 내보내며
  앱 체계와 관리자 체계를 분리하고, 미리보기는 공개 본문·띠 렌더러를 공유한다.
- 브라우저 스크립트는 localhost만 허용하고 자체 생성 공지는 성공/실패 시 정리한다.
  문의/복구 스크립트는 별도의 가짜 테스트 접수/탈퇴 데이터를 먼저 준비해야 한다.
- 재현용 대표 스크린샷은 [evidence/](evidence/)에 둔다. 가짜 테스트 데이터이며
  Notion 이관 시 필요하면 옮긴 뒤 네 MD와 이 임시 증거 폴더를 함께 정리한다.

## 배포·이관 시 남은 일

1. #877 병합 후 #878의 base를 `dev`로 바꿔 Client CI/preview를 확인한다. 현재 base가
   기능 브랜치이므로 dev 대상 Client CI는 실행되지 않는다. 로컬 전체 검사는 통과했다.
   API 배포를 먼저 완료한 뒤 Client를 배포한다. REVIEW_PLANNED를 기록하기 전에 모든
   구버전 서버를 교체한다. 새 상태가 기록된 후 구버전 롤백은 상태 변환 또는 호환 버전이 필요하다.
2. `POUDY_NOTICE_S3_BUCKET`에 비공개 공지 전용 버킷을 설정하고 S3 Get/Put/Delete 권한과
   Public Access Block을 확인한다. 기존 공개 상품 이미지 버킷을 재사용하지 않는다.
   `POUDY_NOTICE_S3_PREFIX`는 기본 `poudy/notices/`, staging `poudy/staging/notices/`이다.
   버킷이 비면 서버는 기동하지만 공지 이미지 업로드는 실패한다.
3. staging에서 실제 이미지 첨부·공개/비공개 접근·고아 이미지 정리를 확인한다.
   API 장애 시 저장 결과가 불명확할 수 있으므로 화면 안내대로 목록/상세에서 재확인한다.
4. 서울 월/7일 경계·문의 동시 변경·SDK 실패/정리 재시도 검증은 아래 보강 기록대로 완료했다.
   실제 AWS 환경의 네트워크/IAM 동작은 staging에서 별도로 확인한다.
5. 아래 코드 기준을 사용자에게 전달하고 Notion/API·ERD Cloud 이관 확인 후에만 네 MD를 삭제한다.
   이 항목과 이슈 병합 확인·운영 확인이 남았으므로 #875와 #868은 완료 처리하지 않는다.

| 이관 내용             | 코드 기준                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 경로·입력/응답·오류   | `inquiry/controller/AdminInquiryController.java`, `user/controller/AdminRecoveryController.java`, `notice/controller/`, `server/openapi.json` |
| 정책·원자성·공개 조건 | `inquiry/service/InquiryService.java`, `user/repository/UserRepository.java`, `notice/domain/Notice.java`, 각 통합 테스트                     |
| ERD·FK·인덱스·트리거  | `V26__admin_inquiry_management.sql`, `V27__user_recovery_history.sql`, `V28__notice.sql`, `V29__inquiry_management_event_time.sql`            |
| Client 계약·검증      | 생성된 `common/api.zod.*`, `client/lib/api/admin-operations.ts`, `client/lib/api/notices.ts`                                                  |

Java 경로는 `server/src/main/java/com/poudy/` 아래, SQL은
`server/src/main/resources/db/migration/` 아래다. API 응답 DTO의 세부 필드는 [api.md](api.md),
FK/삭제·임시 이미지 보관 규칙은 [schema.md](schema.md)를 참고한다.

## 경계·동시성·실패 검증 보강 (2026-10-21)

기존 검사에 12개를 추가했다. 정책 결정이 필요한 변경 없이 확정된 ‘7일 이내’·보관기한·서울 월 기준과 실패 복구를 검사했다.

- `RecoveryBoundaryIntegrationTest`: 고정 Clock의 정확히 7일/±1μs, 30일 보관기한 정각/±1μs,
  보관기간을 14일로 바꿔도 같은 규칙 적용, UTC 세션에서 서울 월 전환 직전/정각의 복구·파기 집계.
  월 경계 검사는 실제 트리거 함수의 시간 읽기만 테스트 트랜잭션에서 치환하고 DDL/데이터를 모두 롤백한다.
- `AdminConsistencyIntegrationTest`: 역순으로 입력한 혼합 원본 bulk 동시 변경(교착/이력 유실 없음),
  동일 상태 8건 동시 변경(이력 1건), 먼저 시작한 트랜잭션이 늦게 변경할 때 이력·메모·최근 수정 시각 순서 유지.
- `NoticeImagesIntegrationTest`: DB 선등록 실패 때 S3 호출 없음, 업로드 실패 보상,
  업로드·보상 삭제 동시 실패 후 pending 유지/만료 정리 재시도, 일부 객체 삭제 후 정리 실패의 DB 롤백과 재시도,
  만료 첨부를 포함한 공개 저장 롤백 및 소유 이미지/유효 pending 정리 제외.

이 과정에서 세 결함을 먼저 재현하고 수정했다.

1. 정확히 7일 남은 계정의 검색 결과/응답 상태 불일치 → EXPIRING 포함 경계 통일.
2. 업로드·보상 삭제 동시 실패 시 객체 추적 불가 → DB pending 선등록, 보상 실패 시 기록 유지.
3. 긴 트랜잭션의 시작 시각 때문에 문의 이력/최근 수정 시각 역전 → V29와 메모 저장의 실제 변경 시각 사용.
   원래 `status_changed_at` 값은 기존 도메인 계약대로 유지한다.

공개 계약/OpenAPI/Zod의 변경은 없으며 프론트엔드 재생성은 필요하지 않다.
실제 AWS의 네트워크/IAM/버킷 동작은 이 검증에 포함하지 않았다. SDK 경계 실패를 재현하며 DB 트랜잭션과
이미지 처리기는 실제 구현을 사용했다. 실제 S3/staging 확인과 외부 문서 이관은 계속 #875에 남는다.
