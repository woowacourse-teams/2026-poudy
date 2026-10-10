# Backend Architecture

## Architecture goal

Poudy 백엔드는 Spring Web MVC 기반의 모듈형 모놀리스다. 기능별 패키지가 유스케이스와
도메인을 소유하고, 전송·저장 기술은 그 바깥에 둔다.

구조와 동작의 권위 원천은 코드와 테스트다. 이 문서는 코드 탐색만으로 복구하기 어려운 책임
경계, 금지된 의존과 의도적인 제약만 기록한다. 카탈로그와 인기 검색어 사전은 PostgreSQL에서
읽으며, 이 선택이 Controller·Service·Domain의 계약이 되지 않도록 Repository 경계 안에 감춘다.

## Package structure

실제 패키지와 클래스는 `src/main/java/com/poudy`에서 확인한다.

```bash
rg --files src/main/java/com/poudy
```

```text
com.poudy
├── <feature>
│   └── <role>            controller, service, domain, repository와 기능 전용 역할
├── search                기능 사이에서 공유하는 검색 언어
├── common                도메인 의미가 없는 횡단 기술
├── config                객체 조립과 프레임워크 설정
└── exception             공통 오류 응답 경계
```

기능 패키지는 필요한 역할만 만든다. `storage`는 회원별 저장 목록이 제품 ID와 저장 시각뿐이라 Domain이
없고, `share`는 제품·브랜드 모델을 사용하는 별도 해석 경계이므로 Repository가
없다. `common`은 횡단 API 계약과 기술 코드만 소유하며 기능 규칙을 가져가지 않는다.

## Dependency direction

기본 흐름은 다음과 같다.

```text
HTTP → Controller → Service → Domain
                         └──→ Repository → PostgreSQL · S3 · 외부 시스템
Config ─────────────────────→ 객체 조립
```

Domain은 Controller, Service, Repository와 프레임워크에 의존하지 않는다. 이 부재 형태의
불변식은 `ArchitectureTest`가 검증한다. 기능 간 조합은 Service나 `config`에서 완결하며,
도메인 규칙은 저장·전송 타입으로 확산하지 않는다. 기능·계층 패키지(`brand.domain`,
`feedback.service` 등) 사이의 순환 참조도 `ArchitectureTest`가 막는다. `exception` 패키지는 기능
패키지를 참조하지 않으며, 기능의 규칙 위반 예외는 오류 코드를 가진 `RuleViolationException`을 상속해
하나의 처리기로 응답한다. 기능 패키지 사이 순환도 같은 테스트가 막는다. 목록 기능에서
`ingredient → tag`, `ingredient → excludecode ← product`, `product → ingredientgroup → excludecode`이며, 제품은 브랜드·카테고리도 참조한다. 제품 수처럼 하위 기능이
상위 기능의 값을 보여 줘야 하면 하위 기능 Domain 패키지에 필요한 조회만 담은 인터페이스
(`BrandProductCounter`, `CategoryProductCounter`, `IngredientUsage`)를 두고 상위
기능이 구현한다. 성분이 속한 제외 성분군을 찾는 포트 `ExcludeCodeLookup`은 값을 소유한 `excludecode` 도메인에 둔다.
집계 결과 타입(`BrandProductCounts`, `CategoryProductCount`)은 그 값을 보여 주는 쪽 기능의 Domain이 소유한다.
성분군 코드는 성분 도메인까지 `ExcludeCode` 값 객체로 전달하고 HTTP 경계에서 문자열로 직렬화한다.

새 저장 구현이 실제로 필요해질 때 Service와 Repository 사이의 포트를 함께 결정한다. 교체
가능성만으로 인터페이스나 빈 계층을 미리 만들지 않는다.

## Domain model

### Search

상품·성분 검색은 PostgreSQL이 정규화·일치·순위·원문 범위를 계산한다. 상품 목록은 모든 토큰이
일치하는 후보를, 검색 제안은 부분 일치 후보까지 사용한다. 브랜드 단독 검색은 `search.domain`을
사용한다. 전환 방향은 [검색 ADR](docs/adr/postgresql-catalog-search.md)을 따른다.

### SearchKeyword

검색어 사전은 표현 해석을, 순위 도메인은 후보 정렬과 변동 계산을 소유한다. 갱신 서비스가
DB 사전·집계 조회와 상품 존재 확인을 조율하고 사전·순위·갱신 시각을 하나의 메모리 스냅샷으로
교체한다. 실패 시 이전 스냅샷을 유지한다. 기동 완료 시 한 번, 이후 시각 기준 10분 경계마다
순위를 다시 계산한다.

### Brand

`brand`는 브랜드의 정체성과 이름 검색을 소유한다. 브랜드별 제품 수와 카테고리 집계는 제품
목록에서 계산되므로 `product`가 소유한다.

### Category

`category`는 카테고리 계층과 부모 관계의 정합성을 소유한다. 카테고리별 제품 수와 빈
카테고리 포함 여부는 제품 집계의 책임이다.

### Ingredient

`ingredient`는 성분과 근거·태그를 소유하며 API 조회는 DB에서 처리한다. `IngredientCatalog`는
조회 대상 상품·제외 성분군에 필요한 성분을 조립한다. 구성품의 `Ingredients`는 전성분 참조의 입력
순서와 중복을 보존한다.

### Tag

태그는 제형에서의 역할과 피부에 기대하는 작용이라는 서로 다른 두 축을 유지한다.
`tag`는 전역 문자열 코드로 식별되는 태그 정의를, `ingredient`는 성분과 태그의 관계 및 근거를
소유한다. 태그 효과 근거는 성분 단위 `ingredient_source(type = EFFECT)`로 저장한다. 두 축의 응답
이름과 의미를 하나의 일반적인 "기능"으로 합치지 않는다.

### Product

`Product`는 브랜드, 카테고리, 구성품(`ProductPart`, 테이블 `product_component`)별로 순서가 보존된
전성분, 판매 옵션과 감각 값을 묶는 중심 애그리게이트다. 상세 응답은 모든 구성품의 요약(`productParts`)과
`partId`로 고른 구성품 하나(`selectedPart`, 없으면 표시 순서가 가장 앞선 구성품)만 담는다. 구성품이 수십 개인
제품에서 같은 성분 정보가 구성품 수만큼 반복되지 않게 하기 위해서다. 구성품의 피부 작용 그룹과 제외 성분군
포함 여부는 그 구성품의 성분만으로 계산한다.
검색과 필터는 DB에서 판정한다. 감각 값은 서버 밖에서 계산해 제품
행에 저장한 수분감·유분감 단계를 그대로 읽으며 목록·상세·필터·개수가 같은 값을 사용한다.
서버는 감각 값을 계산하지 않는다. 지금 저장된 값을 만든 계산 근거와 한계는
[`sensory-inference-v0.md`](docs/product/sensory-inference-v0.md)가 소유한다.

### Products

구성품별 유사도는 외부 데이터 작업이 계산해 `product_similarity`에 저장한다. 서버는 현재 판매
상태와 최종 점수 0.25 기준을 적용해 서로 다른 제품 최대 3개를 조회한다. 주의 판정은 계산에서
선택된 대상 구성품에 한정하며, 계산 완료/미계산 여부는 별도 테이블로 구분한다.
수동 실행과 저장 계약은 [유사 제품 조회](docs/product/product-similarity.md)를 따른다.

상품 목록·개수·필터 선택지는 Repository의 공통 SQL 조건으로 조회한다. 선택지는 자신의 필터만
해제한 후보를 집계하며 첫 페이지에 제공한다. Java는 DB에서 결정한 페이지의 상품을 조립한다.
`Products`는 큐레이션이 참조한 상품을 ID로 해석하는 요청 단위 컬렉션이다.

### ProductView

`productview`는 한국 시간 날짜별 제품 조회수를 카탈로그와 분리해 소유한다. Service는
제품 존재와 한국 시간 날짜를 결정하고, `ViewPeriod`는 오늘을 포함한 집계 기간을 정한다.
Repository는 조회 한 번마다 날짜·제품 행의 횟수를 DB에서 1 올리고, 기간 합산도 DB에서
계산한다. 메모리에 상태를 두지 않으므로 인스턴스가 여럿이어도 기록이 겹쳐 쓰이지 않는다.
제품 행은 지우지 않으므로 과거 날짜의 기록도 제품 FK를 유지한 채 남는다.

### ExcludeCode

`excludecode`는 성분군 중 빠른 제외에 쓰는 것을 다룬다. 성분군의 코드·표시명·설명과 성분 매핑은
DB의 `ingredient_group`, `ingredient_group_ingredient`가 소유하고, 그중 제외 성분군은 서버의
`ExcludeCode` enum이 고정한다. 제외 성분군 목록, `excludeCodes` 필터, 제품 상세의 주의 판정은
enum에 있는 코드만 읽는다. 제외 기준은 필터 계약과 화면 문구가 함께 바뀌어야 하므로 DB 행
추가만으로 늘리지 않는다. enum 코드 중 DB에 성분이 없는 것이 있으면 기동을 실패시킨다. 목록은 코드
순서로 공개한다.
저장소가 SQL 조인으로 성분 ID를 표시 정보로 해석하고, 도메인 `ExcludeCodeGroup`은 정의와
소속 성분을 함께 소유해 포함 여부를 판정한다. `ExcludeCodes`는 공개 순서의 성분군 목록만
보관한다. `excludecode`는 `ingredient` 코드에 의존하지 않는다.

### IngredientGroup

`ingredientgroup`은 성분군 상세 조회와 제품 상세 주요 성분의 묶음을 맡는다. 주요 성분은 제외
성분군을 뺀 성분군으로 묶는다. 한 피부 작용 그룹 안에서 같은 성분군 성분이 2개 이상일 때만 처음
나온 자리에 하나로 묶고, 한 성분이 여러 성분군에 속하면 더 많은 성분을 묶는 성분군을, 같으면 코드
순서가 앞선 성분군을 고른다. 배정한 뒤 성분이 하나만 남은 성분군은 묶지 않는다. 전체 성분표는 묶지 않는다.
성분군 목록과 소속 성분은 `V4__insert_ingredient_groups.sql`이 성분 영문명 규칙으로 넣는다.

성분 검색에는 이름이 검색어를 포함하는 성분군을 함께 제안한다. 제외 성분군은 빠른 필터로만 쓰므로 제안하지
않고, 제품 목록의 `includeGroupCodes`·`excludeGroupCodes`에도 받지 않는다. 포함 성분군은 속한 성분을 하나라도
가진 제품을, 제외 성분군은 하나도 없는 제품을 남긴다. 제외 성분군은 빠른 제외 성분군과 같은 경로로 걸러서,
제외한 성분군의 성분을 포함 조건으로 고르거나 같은 성분군을 포함과 제외에 함께 넣으면 필터 충돌로 거절한다.

### SkinType

`skintype`은 DB의 피부타입 코드와 표시명 정의를 공개 순서로 투영한다. 제품별 피부타입
분류와 필터 판정은 `product`의 책임이며, 표시명을 제품 데이터에 중복 저장하지 않는다.

### Curation

큐레이션 공개 조회 모델은 목록·상세가 공유하는 제목과 설명, 큐레이션 게시 상태를 소유한다.
배너는 목록 노출 여부와 썸네일을, 상세는 블록을 소유한다. 배너 노출은 게시 중인 큐레이션에
비어 있지 않은 썸네일이 있을 때만 허용한다. 목록은 게시 중이며 배너 노출이 활성화된 큐레이션만,
상세는 게시 중인 큐레이션만 조회하며 게시 상태와 배너 노출 여부는 응답하지 않는다. 배너 순서는 최상위 배열이,
블록·필터·제품 순서는 각 하위 배열이 소유한다. 공개 조회 스냅샷의 블록은 모두 공개 대상으로
간주하며 별도 게시 상태를 갖지 않는다. 블록은 이미지, 일반 제품, 필터 기준 제품 타입으로
나뉘며 각 타입이 자신의 필수 값과 공개 투영을 소유한다. 일반 제품은 제품 ID만,
필터 기준 제품은 블록 필터와 제품별 필터 매핑을 보관한다. 제품 참조는 조회 시 현재 카탈로그로
해석한다. 누락 제품과 빈 필터·제품 블록은 응답에서만 제외하며 저장 상태를 바꾸지 않는다.
DB로 이전할 때 배너와 블록의 내부 순서 컬럼으로 배열 응답을 복원하며 공개 API에는 순서
필드를 추가하지 않는다.

### Storage

저장함은 로그인한 회원만 쓰고 `member_saved_product`에 회원·제품·저장 시각(`created_at`)을 둔다.
제품 목록·상세 응답에는 저장 여부를 넣지 않는다. 클라이언트가 저장한 제품 ID 목록
(`/api/members/me/saved-products/ids`)을 따로 받아 표시하고, 저장함 화면은 표시 정보까지 담은
목록(`/api/members/me/saved-products`)을 한 번에 받는다. 둘 다 최근 저장순이다. 저장과 해제는
같은 요청을 다시 보내도 결과가 같다. 회원 행을 지우면 저장 목록도 함께 지워진다(`ON DELETE CASCADE`).

### Share

`share`는 외부 공유 텍스트를 제품 후보로 해석하는 경계다. DB의 제품명 검색과 브랜드별 조회로
후보를 찾고, Java가 버전·제형·용도 차이를 판정해 확정한다. 처리 규칙과 평가 근거는
[`share-text-matching.md`](docs/product/share-text-matching.md)가 소유한다.

### Security

`security`는 Security 설정, 소셜 로그인과 로그인 세션을 소유한다. 회원 기능을 알지 않으며, 가입·조회는
`SocialSignIn` 포트로 맡기고 `member`가 구현한다. 활성 회원 확인도 `MemberActivity` 포트를
`MemberService`가 구현한다. 의존은 `member → security` 한 방향이고, 로그인한
회원이 필요한 기능은 `member` 대신 `security`의 `LoginMember`에 의존한다. `config`는 기능을 모르는
설정만 남긴다.

제공자 응답 해석은 `OAuthProvider`가 맡는다. 카카오 회원번호·구글 `sub`가 제공자 식별자이고, 카카오는
`is_email_valid`·`is_email_verified`, 구글은 `email_verified`가 참일 때만 인증된 이메일로 본다.

로그인 흐름은 Spring Security `oauth2Login`이 처리하고, 컨트롤러가 없는 로그인 시작과 로그아웃 경로는
OpenAPI에 직접 추가한다. 등록하지 않은 제공자는 Security 기본 500 대신 404로 응답한다. Spring OAuth 클라이언트 인터페이스를
구현하는 부품(등록된 제공자만 받는 요청 해석, 제공자 토큰을 버리는 저장소)은 `security.oauth`에 둔다. 운영 nginx가 `/api/`만
백엔드로 넘기므로 시작(`/api/oauth2/authorization/*`)과 콜백(`/api/login/oauth2/code/*`) 경로를
`/api` 아래에 둔다. 제공자 로그인 요청에는 `prompt=select_account`를 붙여, 브라우저에 로그인된 제공자 계정이
있어도 바로 넘어가지 않고 다른 계정을 고를 수 있게 한다. 로그인에 성공하면 세션의 인증을 회원 ID만 가진 인증으로 바꾸고, 제공자 토큰은
저장하지 않는다. 로그인을 마치면 프론트의 `/login/callback`으로 보낸다. 프론트 오리진은 `ClientOrigins`가
CORS 허용 오리진 중 `*`가 없는 첫 값으로 정하고, 비어 있으면 같은 오리진(운영)이다. PR preview는
주소가 PR마다 달라 허용 목록에 와일드카드로만 있으므로, 어느 preview에서 시작했는지 서버가 알 수 없다. 그래서
로그인 시작 요청의 `returnOrigin`을 `ClientOrigins.trustedOrigin`이 판정하고, 믿을 수 있는 값만 `LoginSession`이
그 로그인의 OAuth `state`와 함께 세션에 맡겨 둔다. 콜백의 `state`가 같을 때만 한 번 꺼내 그 오리진으로 보내고,
다르면 꺼내지 않고 기본 주소로 보낸다. 같은 브라우저에서 로그인을 둘 시작하면 앞선 로그인의 콜백이 나중 로그인의
복귀 주소를 가져가지 않게 하기 위해서다. 이 값은 링크를 만든 누구나 넣을 수 있으므로 URI로
해석해 `scheme://authority`와 정확히 같은지 먼저 확인한다. CORS 와일드카드 판정은 `*`를 임의 문자열로 보므로
`https://evil.com/.preview.poudy.site` 같은 값도 통과시키기 때문이다. 그래서 `isAllowedOrigin`은 브라우저가 붙이는
`Origin` 헤더에만 쓰고, 요청 값은 `trustedOrigin`으로만 판정한다. 허용하지 않은 값이나 값이 없으면 기본 주소로
보내고, 세션을 버리는 처리보다 먼저 꺼낸다. 처리하지 못한
예외가 나도 Spring이 먼저 저장한 제공자 인증을 세션과 함께 버리고 로그인 실패로 보낸다. 실패하면 오류 코드를 `error`에,
이메일 중복이면 기존 제공자를 `provider`에 붙인다. 화면 분기는 `status`로 한다. 가입한 회원은 `SIGNED_IN`으로
홈에 가고, 처음 로그인한 계정은 `SIGNUP_REQUIRED`로 가입 확인 화면에 간다. 초기 정보 입력은 가입 직후에만
보여 주고, 입력하지 않고 떠난 회원에게 다시 묻지 않는다.

세션을 만들고 버리고 만료를 판정하는 일은 `LoginSession`이 맡는다. 소셜 로그인 콜백의 성공·실패 처리는 컨트롤러가 아니라 Security 필터가 호출하는 핸들러라서 별도
객체로 두지 않고 `SecurityConfig`의 빈으로 정의하고, 이 핸들러가 `LoginSession`을 호출한다. 로그아웃도
Security 로그아웃 필터가 처리한다. CSRF를 끄면 이 필터가 모든 메서드를 받으므로 POST로 한정하고 204로
응답한다. 코드는 `HttpSession`과 Security의 `SecurityContextRepository`만 쓰므로 세션 저장소를
Redis나 DB로 옮길 때는 Spring Session 의존성과 설정만 바꾸고 이 경계에는 별도 Repository를 두지
않는다. 지금 세션은 서블릿 컨테이너 메모리에 두므로 배포하면 모두 로그아웃된다. 웹 세션은 비활동
1일, 로그인 후 7일에 만료한다. 서블릿 세션에 절대 만료가 없어 세션에 만료 시각을 두고 Security
필터 앞에서 판정한다. 관리자는 환경 변수의 공용 계정으로 `POST /api/admin/login`에 로그인하면 같은
세션에 `ROLE_ADMIN` 인증을 받는다. 로그인 때 기존 세션을 버려 세션 ID를 새로 받고, 비활동 1시간,
로그인 후 12시간에 만료한다. `/api/admin/**`(로그인 제외)은 관리자, `/api/members/**`는 회원 인증만 받고,
인증이 없으면 401 `UNAUTHORIZED`, 다른 쪽 인증이면 403 `FORBIDDEN`으로 거절한다. 회원 인증으로
`/api/members/**`를 호출하면 `ActiveMemberFilter`가 PK 조회 한 번으로 활성 상태를 확인한다.
탈퇴하거나 삭제된 회원이면 세션을 종료하고 401로 거절한다. 이 필터는 인증을 읽은 뒤,
로그아웃 처리 전에 실행하므로 다른 기기의 세션도 다음 회원 API 요청에서 종료된다. 로그아웃은 회원
`POST /api/members/logout`, 관리자 `POST /api/admin/logout`으로 나누고, 둘 다 Security 로그아웃 필터가
자기 역할의 세션일 때만 처리한다. 세션이 없거나 다른 역할이면 필터를 지나 접근 규칙에 따라 401·403으로
거절하고 세션은 그대로 둔다. 나중에 IP 제한 같은 조건을
관리자 인증 전체에 걸 수 있게 관리자 로그인·로그아웃·API를 모두 `/api/admin/` 아래에 둔다. 경로별로 필요한 역할은
`AccessRule`이 정하고, 보안 설정과 OpenAPI의 401·403 문서가 함께 쓴다. 이 판정이 요청마다 세션을 조회하므로 세션 쿠키를 가진 요청은 비활동 만료를
연장한다. 쿠키 수명은 연장하지 않는다. 세션 쿠키는 `HttpOnly`, `SameSite=Lax`, `Domain` 없음이고
수명은 앱 세션에 맞춘 60일이다. 웹의 짧은 수명은 서버가 판정한다. CSRF 토큰 대신 출처를 확인한다. 세션 쿠키가
`SameSite=Lax`라 다른 사이트의 요청에는 실리지 않지만, `SameSite`는 사이트 단위라 `*.poudy.site`
(staging 포함)에서 온 요청에는 운영 쿠키가 실리고, 본문 없는 POST는 CORS preflight도 거치지 않는다.
그래서 GET·HEAD·OPTIONS·TRACE가 아닌 요청은 `Origin`이 같은 오리진이거나 `ClientOrigins`가 허용하는 오리진일 때만
통과시키고, 아니면 403 `FORBIDDEN_ORIGIN`으로 거절한다. 이 확인은 `security.filter`의 `ForeignOriginFilter`가 맡는다. `Origin`이 없는 요청은 브라우저가 아니므로
통과시킨다. 토큰 방식은 staging에서 프론트와 API 호스트가 달라 쿠키로 토큰을 읽을 수 없어 쓰지 않는다. Security 기본 `Cache-Control: no-store`는 꺼서 기존 응답 캐시를 바꾸지 않고, 회원 응답만
`no-store`로 둔다.

### Member

`member`는 회원과 초기 정보(성별·나이대·피부 타입)를 소유한다. 회원은 제공자와 제공자 식별자로
식별하고, 이메일은 가입 시점에 제공자가 인증한 값을 소문자로 저장해 다른 제공자의 중복 가입을 막는
데만 쓴다. 가입은 `MemberSignup`이 소셜 계정의 인증된 이메일을 한 번만 검증해 담고, 중복 확인과 저장이
같은 값을 쓴다. 만 14세 미만은 법정대리인 동의 절차가 없어 받지 않으므로, 처음 로그인한 계정은 바로 저장하지
않는다. 이메일 인증과 중복을 먼저 확인한 뒤 그 소셜 계정만 로그인하지 않은 세션에 10분 동안 맡겨 두고, 사용자가
가입 화면에서 만 14세 이상임을 직접 체크해 `POST /api/auth/signup`을 보내야 회원 행을 만들고 같은 세션으로
로그인시킨다. 이 경로 말고는 회원 행이 생기지 않으므로 행이 있다는 것이 확인했다는 기록이다. 가입하지 않고
떠나면 세션과 함께 사라져 남는 개인정보가 없다. 맡겨 둔 사이 다른 제공자로 같은 이메일이 가입했으면 가입 때 다시
확인해 거절한다. 이미 가입한 회원은 이메일 상태와 무관하게 로그인한다. 초기 정보는 아는 것만 고르게 해 셋 다
비어 있어도 되고, 저장할 때 고르지 않은 것은 비운다. 피부 타입의 `UNKNOWN`은 회원 전용
값이라 제품 필터 선택지인 `skin_type` 테이블을 참조하지 않는다. 탈퇴는 회원 행을 지우지 않고 `deleted_at`만
남긴 뒤 로그인 세션을 끝낸다. 탈퇴 회원은 회원 조회에서 빠진다. 같은 소셜 계정으로 다시 로그인하면
로그인시키지 않고, 그 탈퇴 회원 ID만 로그인하지 않은 세션에 10분 동안 맡겨 둔 채 프론트에 탈퇴 안내를
보낸다. 사용자는 이 세션으로만 복구를 요청할 수 있어 다른 회원을 사칭할 수 없고, 요청은
`restore_requested_at`에 남는다. 이미 복구를 요청한 회원이 다시 로그인하면 세션을 맡기지 않고 복구 요청
중이라는 안내만 보낸다. 관리자는 복구를 요청한 탈퇴 회원만 복구할 수 있고, 복구하면 `deleted_at`과
`restore_requested_at`을 비워 다시 로그인하게 한다. 복구 요청 목록은 요청한 순서대로 보여 준다. 탈퇴 회원
행은 `MemberRetentionService`가 매일 새벽 탈퇴한 지 30일이 지난 것을 지운다. 복구를 요청했어도 30일 안에
복구하지 않으면 지우고, 그 뒤 같은 계정으로 로그인하면 새로 가입한다. 운영 프로필에서만 켠다. 탈퇴 회원의 이메일도 남아 있어 다른 제공자로 같은 이메일 가입은 계속 막힌다. 카카오 연결 끊기는 어드민
키가 필요해 아직 하지 않고, 구글은 토큰 없이 연결을 끊을 수 없어 사용자가 계정 설정에서 해제한다.

## Layer responsibilities

### Controller

Controller는 HTTP 경로, 입력 검증과 응답 변환을 소유한다. 도메인 검색·필터 규칙을 구현하지
않으며, 전송 DTO를 기능의 공개 도메인 모델로 만들지 않는다.

### Service

Service는 유스케이스를 완결하기 위해 Repository와 Domain을 조합한다. 여러 기능의 데이터가
필요한 경우에도 Controller끼리 연결하지 않고 Service 한 곳에서 결과를 완성한다.

### Domain

Domain은 상태와 그 상태에 관한 판단을 함께 소유한다. 저장소와 프레임워크 없이 실행할 수 있어야
하며, 이 경계는 `ArchitectureTest`로 강제한다. 도메인은 저장 매핑을 갖지 않고 생성자로만 만들어지므로,
DB에서 읽은 값도 생성자 검증을 거친다.

### Repository

Repository는 DB·S3 같은 저장 표현을 도메인으로 변환하고 저장 실패를 인프라 오류로
분류한다. 저장 형식 전용 타입과 프로토콜은 구현 내부에 두고 Controller 응답을 만들지 않는다.
모든 DB 접근은 Spring JDBC로 하고, 조회 결과로 도메인을 직접 조립한다. 테이블·컬럼과
도메인의 대응은 Repository의 SQL과 행 변환이 소유한다.
불변식은 도메인과 스키마 제약이 보장한다. 카탈로그는 요청에 필요한 행을 DB에서 조회하며,
여러 조회의 일관성은 읽기 전용 REPEATABLE READ 트랜잭션으로 유지한다.

스키마는 Flyway가 서버 기동 시 `db/migration`의 버전 순서로 적용하고, 적용 이력은
`flyway_schema_history`에 남는다. Flyway 도입 전부터 운영하던 DB는 첫 기동에 `V2`까지 적용된 것으로
baseline을 등록한다. 등록은 이력이 없는 DB에서만 일어나고 스키마를 검사하지 않으므로, 첫 배포 전에
스키마가 `V2`와 같은지 확인한다. 적용된 마이그레이션 파일은 고치지 않고 변경은 새 버전 파일로 추가한다.
배포 중에는 기존 서버와 새 서버가 같은 DB를 함께 쓰므로 마이그레이션은 기존 서버가 계속 동작하는
형태로 작성한다. 테이블·컬럼 삭제와 이름 변경은 새 구조를 추가하는 배포와 옛 구조를 지우는 배포로
나눈다. 마이그레이션이 실패하면 서버가 뜨지 않는다. 한 행으로 표현되지 않는 규칙(제품 비삭제·ID 불변,
제품당 옵션 하나 이상, 필터형 큐레이션 블록의 필터 연결)은 트리거가 적재 커밋 시점에 막는다. 적재는 READ COMMITTED 또는
SERIALIZABLE로 하고, 옵션·큐레이션 전체 교체는 TRUNCATE가 아니라 DELETE 후 다시 넣는다.

운영 데이터는 커밋하지 않는다. 테스트와 OpenAPI 생성은 `test` 프로필로 개발 DB와 분리된
테스트 DB를 쓰며, 컨텍스트가 뜰 때마다 스키마를 비우고 운영과 같은 마이그레이션을 적용한 뒤
`afterMigrate` 콜백으로 테스트 데이터를 넣는다. 실제 서버는 운영
DB를 사용한다.

### Exception handling

도메인 규칙 위반은 도메인 예외로 표현하며 HTTP 상태를 알지 않는다. `GlobalExceptionHandler`가
도메인·요청·인프라 오류를 RFC 9457 `ProblemDetail` 계약으로 변환한다. 인프라 원인 메시지는
로그에만 남기고 응답에 노출하지 않는다.

### CORS

CORS는 `/api/**`에만 적용하며 허용 오리진은 `CLIENT_DOMAIN`이 소유한다. 값이 없으면 열지 않는
것이 기본값이다. staging과 로컬은 프론트와 API 오리진이 달라 세션 쿠키를 보내야 하므로 허용한
오리진에는 자격 증명을 허용한다. 운영은 같은 오리진 nginx 프록시를 사용하므로 `CLIENT_DOMAIN`을
비워 CORS를 열지 않는다. CORS는 Security 필터 체인에서 처리한다. `CLIENT_DOMAIN` 해석은
`security`의 `ClientOrigins` 한 곳이 맡아 CORS 설정, 상태 변경 요청의 출처 확인, 로그인 후 이동 주소가 같은
오리진 목록을 쓴다.

## API decisions

엔드포인트와 스키마의 권위 원천은 Controller, DTO와 OpenAPI 설정 코드다. `openapi.json`과
`common/api.zod.*`는 검증·소비용 생성물이므로 직접 수정하지 않는다. 이 문서에는 엔드포인트
목록을 복제하지 않는다.

클라이언트가 서버의 enum과 오류 코드를 손으로 복사하지 않도록, API에 노출되는 enum은 모두 이름 있는
스키마로 문서화한다. 도메인 enum에 Swagger 어노테이션을 붙이지 않으려고 `OpenApiConfig`가 이를 전역으로
켜며, 새 enum도 따로 표시하지 않아도 같은 방식으로 생성된다. 이때 파라미터에 둔 기본값은 그 파라미터가
아니라 enum 스키마에 붙는다. `ProductSort`의 `DEFAULT`가 그렇다. 같은 enum을 기본값이 다른 자리에서
쓰게 되면 기본값을 enum이 아닌 그 자리에서 정하도록 바꿔야 한다. `ErrorCode`는 `ProblemDetailResponses`가
직접 컴포넌트로 등록하고 `ProblemDetail.code`가 참조한다. `common/api.zod.ts`는 엔드포인트별 파라미터
스키마까지 생성해 클라이언트가 기본값과 범위를 따로 들고 있지 않게 한다.

제품 검색과 필터는 같은 제품 컬렉션을 좁히는 조건이므로 `/api/products`에서 결합한다. 검색
제안은 표시용 일치 정보라는 다른 표현을 반환하므로 별도 경계를 사용한다. 목록과 count는 같은
요청 해석과 필터 규칙을 공유해야 한다.

서비스 의견과 제품 정보 정정 요청은 입력 계약을 나눈다. `POST /api/feedbacks`의 유형은 필드와
처리가 같고 분류만 다른 서비스 의견만 담으며, 작성 화면 경로는 클라이언트가 알 때만 받는 참고
정보다. 모르는 경로를 `/`로 채우면 홈에서 쓴 의견과 구분되지 않으므로 비워 둔다. 제품 정보
정정은 대상 제품이 필수이므로 `POST /api/products/{productId}/correction-requests`가 경로로
받고, 제품이 없으면 접수하지 않는다. 제품 등록 요청도 서비스 의견이 아니라 제품 데이터에 대한
요청이므로 `POST /api/products/registration-requests`로 제품 컬렉션 아래에 둔다. 문의하기 화면이
세 요청을 한곳에서 보내는 것은 화면 구성일 뿐 API 자원 구분의 근거가 아니다. 두 요청은 내용 검증, 요청 제한, 이미지 귀속과
Discord 알림이 같으므로 `feedback` 안에서 `FeedbackSubject`로만 구분하고 같은 저장 경계를
공유한다. 저장은 서비스 의견을 `feedback`, 제품 정보 정정 요청을 `product_correction_request`
테이블에 나눠 두고 제품 등록 요청은 `product_request`에 둔다.

첨부 이미지는 기존 2단계 API를 유지한다. `POST /api/pending-images`가 검증·정규화한
이미지를 pending으로 저장하고 일회성 `imageIds`를 반환하며, 의견 등록이나 제품 정보 정정
요청이 그 ID를 받아 접수 건에 귀속시킨다. 이미지 파일은 S3에 두고 DB에는 이미지 ID와 순서만
기록한다. 확장자는 이미지 ID에 대응하는 S3 객체 키에서 복원한다. 조회는 접수 건의 최종 경로를 한 번 목록 조회해 찾고, 아직 옮기지 못한 이미지는 pending에서 찾으며, 파일이 없는 이미지는 오류 로그를 남기고 응답에서 뺀다. 보유기간 삭제는 확장자 없이 접수 건 경로 아래를 모두 지운다. 귀속은 outbox 방식이다. 접수 건과
이미지 행을 한 트랜잭션으로 커밋하고, 커밋 뒤 pending을
최종 경로로 복사하고 지운다. 별도 outbox 테이블은 두지 않는다. DB 이미지 행이 할 일 기록이고, 아직
남은 pending이 미처리 표시다. 요청 안에서 옮기지 못했거나 서버가 멈춘 경우는 스케줄러가 pending 목록과
DB 이미지 행을 대조해 다시 옮긴다. 옮기기는 같은 원본 ETag 조건 복사라 여러 번 실행해도 결과가 같다.
DB에 없는 pending은 만료 후 유예 시간이 지나야 지워, 만료 직전에 커밋된 접수 건의 원본을 지우지 않는다.
정리 작업은 자기 DB만 보고 소유자가 없는 pending을 지우므로, 같은 버킷을 쓰는 환경끼리는
pending 경로(`poudy.feedback.image-s3.pending-prefix`)를 서로 겹치지 않게 나눈다. 운영은
`poudy/feedback/pending/`, 스테이징은 `poudy/staging/feedback/pending/`을 쓴다. 최종 경로는 접수 건
ID가 DB마다 달라 겹치지 않으므로 나누지 않는다.
이미지 ID의 고유 제약은 두 이미지 테이블에 따로 걸려 있으므로, 저장 트랜잭션 안에서 이미지 ID마다
advisory lock을 잡은 뒤 두 테이블을 확인해 이미 쓰인 ID를 거절한다. 같은 ID로 동시에 들어온 요청은
앞선 요청의 커밋을 기다린 뒤 그 행을 보고 거절되므로, 한 이미지는 접수 건 하나에만 귀속된다.

업로드 입력은 파일명이나 선언된 Content-Type 대신 실제 바이트로 JPEG, PNG 또는 `heic`/`heix`
brand의 HEIC인지 판별하고 각 디코더가 실제로 읽을 수 있는지 확인한다. 크기·해상도·픽셀 상한을
적용하고 기본 프레임을 끝까지 디코딩한 뒤 메타데이터를 옮기지 않고 재인코딩한다. JPEG와
HEIC는 JPEG로, PNG는 PNG로 저장한다. JPEG/PNG의 다중 프레임 표식, reader warning이나 디코더가
무시할 수 있는 꼬리 데이터를 수동 파싱해 거절하지 않고, 허용한 기본 프레임의 픽셀만 새 이미지로
정규화한다. HEIC는 외부 디코더가 JPEG 파일을 정확히 하나 만든 경우만 다음 단계로 넘긴다.
디코딩·재인코딩 동시성 permit은 CPU와 메모리 소모 구간만 보호하며 S3 저장 대기 중에는 점유하지 않는다.

HEIC는 자원 상한과 빈 환경을 적용한 별도 `heif-convert` 프로세스로 디코딩한다. 백엔드 호스트
초기화 스크립트가 Amazon Linux의 `libheif-tools`, `libde265`, `util-linux-core` 패키지를 설치하고
필요한 실행 파일을 확인한다.

피드백과 제품 등록 요청은 영속 저장을 성공 기준으로 삼고, 이후 알림 실패가 이미 저장한 접수를
되돌리지 않는다.

공유 텍스트 식별은 제품의 공개 API이지만 해석 책임은 `share`가 소유한다. 세부 계약은
[`share-text-matching.md`](docs/product/share-text-matching.md)에서 관리한다.
