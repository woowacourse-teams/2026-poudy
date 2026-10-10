# 웹 소셜 로그인 (카카오·구글)

- 소유 도메인: `security`(Security 설정·소셜 로그인·세션), `member`(회원·초기 정보)
- 연관 경계: `config`(CORS), `exception`, `openapi`, `deploy`(환경 변수)

## 목표와 범위

웹에서 카카오와 구글 계정으로 가입·로그인하고, 쿠키 세션으로 로그인 상태를 유지한다.

- 로그인 시작: `GET /api/oauth2/authorization/{kakao|google}` (Spring Security 필터)
- 제공자 콜백: `GET /api/login/oauth2/code/{kakao|google}` (Spring Security 필터)
- `GET /api/members/me`: 로그인한 회원 정보와 초기 정보
- `POST /api/auth/signup`: 처음 로그인한 사람이 만 14세 이상임을 확인하고 가입한다. 로그인 처리에서 세션에
  맡겨 둔 소셜 계정으로만 가입하고, 가입하면 같은 세션으로 로그인시킨다
- `PATCH /api/members/me/profile`: 성별·나이대·피부 타입 중 고른 것만 저장하고 고르지 않은 것은 비운다. 이후 변경에도 쓴다
- `DELETE /api/members/me`: 회원 탈퇴. 행을 지우지 않고 `deleted_at`을 남긴 뒤 세션을 끝낸다
- `POST /api/auth/withdrawn-member/restore-request`: 탈퇴 계정으로 다시 로그인한 사람의 복구 요청.
  로그인 처리에서 세션에 맡겨 둔 탈퇴 회원에게만 `restore_requested_at`을 남긴다
- `POST /api/members/logout`: 회원 세션 무효화. 관리자 세션은 403으로 거절한다
- 탈퇴 회원 파기: 매일 03:40 탈퇴한 지 30일이 지난 회원 행을 지운다(`poudy.member.retention`, 운영만 켬)
- `GET /api/admin/members/restore-requests`: 복구를 요청한 탈퇴 회원 목록. 요청한 순서대로 페이지로 준다
- `POST /api/admin/members/{memberId}/restore`: 복구를 요청한 탈퇴 회원 복구. `deleted_at`과
  `restore_requested_at`을 비운다

하지 않는 것: 모바일 네이티브 로그인(토큰 교환 엔드포인트), 저장함(`member-saved-products.md`), 탈퇴 시 카카오 연결 끊기(어드민
키 필요). 각각 다음 작업으로 남긴다.

## 설계

- 회원은 `(oauth_provider, oauth_provider_id)`로 식별한다. 이메일은 가입 시점 값이고 중복 가입을
  막는 데만 쓴다. 다른 제공자로 이미 가입한 이메일이면 가입을 거절하고 기존 제공자를 알린다.
- 제공자가 인증한 이메일만 받는다. 카카오는 `is_email_valid`·`is_email_verified`, 구글은
  `email_verified`가 모두 참이어야 한다. 이미 가입한 회원은 이메일 상태와 무관하게 로그인한다.
- `security`는 회원을 모르고 `SocialSignIn` 포트로 가입·조회를 맡긴다. `member`가 포트를 구현하므로
  의존은 `member → security` 한 방향이다. 제공자별 응답 해석은 `OAuthProvider`가 `OAuthAccount`로
  바꾼다. 구글은 `openid`·`email`로 OIDC, 카카오는 OIDC 없이 `/v2/user/me`를 쓴다.
- 로그인에 성공하면 세션의 인증 정보를 회원 ID만 가진 인증으로 바꾼다. 제공자 응답을 세션에
  들고 있지 않고, 이후 모바일 로그인도 같은 인증을 만든다.
- 세션은 서블릿 컨테이너 메모리에 둔다. 배포하면 모두 로그아웃된다.
- 웹 세션은 비활동 1일, 로그인 후 7일이 지나면 만료한다. 절대 만료는 서블릿 세션에 없으므로
  세션에 로그인 시각을 두고 Security 필터 앞에서 판정한다.
- 세션 쿠키는 `HttpOnly`, `SameSite=Lax`, `Domain` 없음, `Max-Age` 60일이다. 쿠키 수명은 전역
  설정이라 앞으로 붙일 앱 세션(60일)에 맞추고, 웹의 짧은 수명은 서버가 판정한다.
- CSRF 토큰 대신 상태 변경 요청의 `Origin`을 확인한다. 같은 오리진이나 CORS 허용 오리진이 아니면
  403 `FORBIDDEN_ORIGIN`이다. `SameSite=Lax`는 `*.poudy.site`(staging)에서 온 요청과 본문 없는 POST를
  막지 못해서 더한다. `Origin`이 없는 요청(브라우저 아님)은 통과시킨다.
- 운영 nginx는 `/api/`만 백엔드로 넘기므로 Security 로그인 경로를 `/api` 아래로 옮긴다.
- Preview 로그인은 시작 요청의 `returnOrigin`을 허용된 HTTP(S) 오리진인지 검증해 OAuth `state`와 함께
  세션에 저장하고, `state`가 같은 콜백의 성공·실패에서만 한 번 소비해 해당 프론트의 `/login/callback`으로 보낸다. 경로·쿼리·fragment·userinfo가
  있는 값은 거절하고 기존 고정 주소로 복귀한다. 세션 무효화 전에 복귀 주소를 꺼낸다.
- 복귀 오리진이 없으면 프론트의 `/login/callback`으로 보낸다. 프론트 오리진은 `CLIENT_DOMAIN`의 `*` 없는
  첫 값이고, 비어 있으면 같은 오리진(운영)이다. 실패하면 같은 주소에 `error`
  (오류 코드)와, 이메일 중복이면 `provider`를 붙인다. 로그인을 마치면 `status`에 `SIGNED_IN`을, 탈퇴 계정이면
  `WITHDRAWN`을, 이미 복구를 요청했으면 `RESTORE_REQUESTED`를 붙이고 이때는 탈퇴 회원을 세션에 맡기지 않는다.
  처음 로그인한 계정이면 `SIGNUP_REQUIRED`를 붙인다. 화면 분기는 프론트가 `status`로 한다. 초기 정보 입력은
  가입 직후에만 보여 준다.
- 만 14세 미만은 받지 않는다(법정대리인 동의 절차 없음). 처음 로그인하면 회원을 저장하지 않고 이메일 인증·중복만
  확인한 뒤 소셜 계정을 로그인하지 않은 세션에 10분 동안 맡긴다. 가입 화면에서 만 14세 이상을 직접 체크해야
  `POST /api/auth/signup`으로 회원을 만든다.
- staging·로컬은 프론트와 API 오리진이 달라 CORS 자격 증명을 허용한다. 운영은 같은 오리진이라
  `CLIENT_DOMAIN`을 비워 CORS를 열지 않는다.
- Security 기본 `Cache-Control: no-store`는 끈다. 기존 응답 캐시(nginx·Next)를 바꾸지 않는다.
  회원 응답만 컨트롤러에서 `no-store`로 둔다.
- 회원·관리자 API 외의 기존 API는 공개로 둔다. 관리자 API는 공용 계정 로그인으로 받은 관리자 세션
  (`ROLE_ADMIN`, 비활동 1시간·로그인 후 12시간)이 있어야 호출한다.

## 검증

- 도메인: 이메일 인증 여부, 이메일 정규화
- 저장소: 저장·제공자 식별자 조회·이메일 조회, 고유 제약
- Service: 기존 회원 로그인, 처음 로그인하면 저장하지 않음, 가입, 미인증 이메일 거절, 다른 제공자 이메일 중복 거절
- 로그인 처리: 카카오·구글 응답 해석, 성공 시 회원 인증과 세션 정책, 실패 리다이렉트
- 세션: 7일 절대 만료, 가입할 계정은 10분 동안 한 번만 꺼냄, 기존 회원으로 로그인하면 맡긴 계정을 버림
- 가입 API: 맡긴 계정으로 가입·로그인, 같은 세션 재요청과 맡긴 계정 없음 404, 그사이 이메일 중복 400
- API: 미로그인 401, 로그인 시 회원 정보, 초기 정보 저장·일부만 저장·모르는 값 400, 로그아웃 204,
  기존 공개 API 유지
- `sh ./scripts/verify.sh`

## 진행

- 2026-10-04 서버 구현, `sh ./scripts/verify.sh` 통과(테스트 901개, 실패 0). OpenAPI와
  `common/api.zod.*` 재생성. 실제 카카오·구글 계정으로 끝까지 로그인하는 확인은 아직 하지 않았다.
- 리뷰에서 찾은 결함(로그인 처리 중 예상하지 못한 예외가 나면 Spring이 먼저 저장한 제공자 인증이
  세션에 남아 회원 API가 500을 내는 문제)을 세션 정리로 고쳤다.

## 배포 전 할 일

- 운영·staging `backend.env`: `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, staging은 `CLIENT_DOMAIN`
- staging 프론트를 `staging-app.poudy.site`, PR preview를 `pr-<번호>.preview.poudy.site`로 옮기기
  (쿠키를 API와 같은 사이트로 맞춤, #619)
- staging `CLIENT_DOMAIN=https://staging-app.poudy.site,https://*.preview.poudy.site`. 고정 주소가 첫 값이어야
  기본 복귀 주소가 된다. 프론트는 HTTPS의 `*.preview.poudy.site`에서만 로그인 링크에 현재 오리진을 붙인다.
- 운영 nginx가 `X-Forwarded-Proto`를 넘기는지 확인 (`redirect_uri`가 https로 만들어져야 한다)
