# 피부 선택지 정의와 선택한 0개 필터 유지 (#1110)

## 상태와 근거

- 상태: 서버 구현·검증 완료. 홈 API 전환과 칩·태그의 서버 이름 소비는 합의한 후속 범위다.
- 기준: 2026-11-09에 fetch한 `origin/dev`의 `8573efee73f393ae165e93c3a39b1460dfe950a8`.
  작업 브랜치는 `feat/1110`이다.
- [#1110](https://github.com/woowacourse-teams/2026-poudy/issues/1110)과
  [합의 코멘트](https://github.com/woowacourse-teams/2026-poudy/issues/1110#issuecomment-6731498330)를 따른다.
  #1078의 `selectedFilters` 계약은 아래 계약으로 대체한다.
- 현재 `ProductQueryRepository`의 SQL은 브랜드·카테고리·피부 타입·민감성 개수를 이미 집계한다.
  첫 페이지 브랜드 정의 조회에는 선택 ID도 포함하고, 카테고리는 전체 정의를 한 번 읽는다.
  따라서 새 집계 쿼리나 선택별 조회 없이 응답을 조립할 수 있다.
- 작업 전 클라이언트는 `selectedFilters`를 목·계약 테스트에서만 사용했다. 홈은 `/api/skin-types`를
  호출하고 민감성을 클라이언트에서 추가한다. 제품 목록은 `sensitiveSkin`을 boolean으로 소비한다.

## 응답 계약

### 전체 피부 선택지: GET /api/skin-options

```json
{
  "skinTypes": [
    { "code": "DRY", "name": "건성" },
    { "code": "OILY", "name": "지성" },
    { "code": "COMBINATION", "name": "복합성" }
  ],
  "sensitiveSkin": { "name": "민감성" }
}
```

- 검색 조건과 관계없는 전체 표시 정의다. 민감성 이름은 항상 포함하며 개수는 제공하지 않는다.
- `SkinType`은 기존 세 값만 유지한다. 민감성은 별도 조건이며 `SENSITIVE`를 enum에 추가하지 않는다.
- 피부 타입 순서는 기존 순서를 유지한다. 민감성 이름은 `skintype` 기능에 한 번만 정의하고
  이 응답과 제품 목록 응답이 같은 정의를 사용한다. 이름을 위한 DB 테이블·조회는 추가하지 않는다.
- 기존 `/api/skin-types`는 현재 홈 호출의 호환성을 위해 기존 응답 그대로 유지한다.
  홈의 새 API 전환은 후속 클라이언트 작업에 포함하고, 기존 경로 제거는 사용처 전환 뒤 별도 결정한다.

### 제품 목록: GET /api/products의 첫 페이지

- `selectedFilters`를 제거한다. `items`, `pagination`, `markGroups`의 계약은 유지한다.
- `filterOptions`는 양수인 후보와 실제로 존재하는 선택의 합집합을 반환한다.
  선택한 값은 다른 조건 때문에 후보에서 빠져도 이름과 `productCount: 0`을 포함한다.
  선택하지 않은 0개 항목 전체를 반환하지 않는다. 카테고리의 구조상 필요한 부모는 예외다.
- 선택 여부는 URL과 편집 초안이 소유한다. 응답에 `selected`·`available` 필드를 추가하지 않는다.
  개수 0은 해당 집계 범위의 제품이 없다는 뜻이며 선택 여부를 뜻하지 않는다.

| 필드 | 응답과 포함 기준 | 개수 계산에서 제외하는 조건 |
| --- | --- | --- |
| `brands` | 기존 `id`, `name`, `englishName`, `imageUrl`에 `productCount` 추가. 양수 또는 선택된 실제 브랜드 | `brandIds` 전체 |
| `categories` | 기존 부모·자식 트리와 개수 유지. 양수 또는 선택된 카테고리와 구조에 필요한 부모 | `categoryIds` 전체 |
| `skinTypes` | 기존 `code`, `name`에 `productCount` 추가. 양수 또는 선택된 피부 타입 | `skinType`, `sensitiveSkin` 모두 |
| `sensitiveSkin` | 후보가 있거나 선택 중이면 `{ name, productCount }`, 둘 다 아니면 `null` | `skinType`, `sensitiveSkin` 모두 |

- `sensitiveSkin`은 첫 페이지의 `filterOptions` 안에서 필수 nullable 필드다.
  선택했지만 후보가 없으면 객체와 0개를 제공한다. 객체에는 불필요한 식별 코드를 추가하지 않는다.
- 검색어·성분·나만의 필터·유수분·마크 등 나머지 조건은 기존처럼 보존한다.
  최종 결과 수와 개별 후보 수를 구분하고, 결과가 0개라고 모든 후보 수를 0으로 만들지 않는다.
- 피부 타입과 민감성의 기존 OR 의미, 다른 필터 그룹과의 AND 의미를 유지한다.
  타입별 수와 민감성 수는 서로 겹칠 수 있으므로 합계를 전체 제품 수로 취급하지 않는다.
- 브랜드는 기존 이름순, 카테고리는 기존 ID순, 피부 타입은 기존 enum 순서로 조립한다.
  선택 항목을 별도 목록으로 두거나 요청 순서로 반환하는 계약은 더 이상 필요하지 않다.

### 카테고리와 없는 ID

- 선택한 소분류의 집계가 0개여도 해당 소분류와 부모를 트리에 포함한다.
  부모 개수는 실제 집계값을 사용하며, 선택한 자식이 0개라는 이유로 부모 개수를 덮어쓰지 않는다.
- 부모만 선택한 경우 제품이 없는 자식까지 모두 추가하지 않는다.
  자식은 양수 후보 또는 직접 선택한 값만 포함한다. 중복된 부모·자식을 만들지 않는다.
- 존재하지 않는 브랜드·카테고리 ID는 응답에서 생략한다. 400으로 바꾸거나 요청에서 자동 제거하지 않는다.
  없는 ID만 선택한 경우 0개, 같은 필터에 정상 ID와 섞은 경우 정상 ID에 해당하는 결과를 유지한다.
- 현재 조건의 첫 페이지 응답을 확보한 뒤 선택 ID가 응답에도 없을 때만 없는 ID로 구분한다.
  후속 페이지 필드 생략·요청 실패·미확보 상태를 삭제된 ID로 판단하지 않는다.
  이름을 모르는 선택의 기존 대체 문구와 개별 해제를 유지한다.

### 페이지와 캐시

- `filterOptions`는 첫 페이지에만 제공한다. 후속 페이지는 계산·정의 조회·필드를 모두 생략한다.
- 첫 페이지의 빈 배열과 `sensitiveSkin: null`은 새 값으로 갱신하고,
  후속 페이지에서 `filterOptions`가 생략되면 보관한 첫 페이지 정보를 유지한다.
- 새로고침·공유 링크의 첫 페이지에서 선택 이름을 복원할 수 있어야 한다.
  중간 페이지 직접 진입 시 기존 첫 페이지 이동 안내를 유지하며 숨은 추가 목록 요청은 만들지 않는다.

## 구현 경계와 순서

1. **피부 선택지 정의와 새 API**
   - `skintype`에 `/api/skin-options` 컨트롤러·응답과 공유 표시 정의를 추가한다.
   - 정의 응답은 기존 `SkinTypeResponse`를 재사용할 수 있다. 개수는 정의 DTO에 추가하지 않는다.
   - 기존 enum·회원 프로필·제품 쿼리 바인딩은 변경하지 않는다.
2. **목록 집계 결과와 응답 조립**
   - `ProductFilterOptions`의 브랜드는 기존 `BrandProductCount`를 재사용한다.
     피부 타입은 `SkinTypeProductCount`, 민감성은 nullable 개수로 boolean/enum-only 반환을 대체한다.
     집계 계산은 저장소 경계 안에 두고 Domain에서 DTO를 참조하지 않는다.
   - `ProductQueryRepository.Facets`가 현재 요청의 선택과 기존 count Map을 함께 사용해
     양수 후보·선택한 0개 값·카테고리 부모를 조립한다. SQL의 후보 판정은 바꾸지 않는다.
   - 목록용 브랜드·피부 타입 DTO를 둔다. 공유 `BrandResponse`·`SkinTypeResponse`에 개수를
     추가해 카드·상세·전체 정의 응답까지 변경하지 않는다.
     `BrandSummaryResponse`도 전체 카탈로그 개수 계약이므로 필터 개수 응답에 그대로 사용하지 않는다.
   - `ProductPage`·`ProductPageResponse`의 `selectedFilters`와 사용하지 않는
     `ProductSelectedFilters`, `ProductSelectedFiltersResponse`, `ProductFilterSelectionResponse`를 제거한다.
     서비스 테스트 등 생성자 사용처도 함께 변경한다.
3. **계약·생성물·클라이언트 호환성**
   - `client/FILTER_OPTIONS.md`의 #1078 계약을 대체하고 정적 정의 API와 조건별 목록 응답의 역할을 구분한다.
   - `./gradlew generateApiArtifacts`로 `server/openapi.json`과 `common/api.zod*`를 생성한다.
     `sensitiveSkin`의 required+nullable과 후속 페이지 `filterOptions`의 optional을 구분한다.
   - `client/mocks/handlers.ts`에 새 API·동일한 후보 합집합·0개·null·페이지 규칙을 반영하고
     `mock-filter-options.test.ts`, `mock-schema.test.ts` 등 관련 fixture를 갱신한다.
   - 생성 타입을 바꾸면 `ProductList.tsx`의 boolean 전달도 깨진다. 목 변경만으로
     완료하지 않고 해당 소비 경계의 타입·동작 호환 수정을 함께 계획한다.
   - 실제 홈 API 전환, 칩·태그의 서버 이름 사용, 0개 항목의 표시·해제는 #1079와
     피부 관련 후속 클라이언트 작업으로 연결한다. 기존 목록에 ID가 있는지로 후보를 판정하던 코드는
     개수 기준으로 바꾸고, 선택된 0개 항목의 해제를 막지 않아야 한다.
   - 이 단계의 서버 밖 계약·목·호환 수정은 이번 이슈에서 합의한 연동 범위로 한정한다.
     화면 디자인 변경이나 관련 없는 정리는 포함하지 않는다.
4. **검증 후 배포 연계**
   - `sensitiveSkin` 타입 변경은 기존 클라이언트 응답 검증과 호환되지 않는다.
     호환 클라이언트 준비 없이 서버만 배포하지 않으며, 배포 순서를 후속 작업과 맞춘다.
   - DB/Flyway 변경은 없다. 목록·count의 검색 의미와 조회 횟수를 유지한다.

## 검증 계획

- `SkinTypeQueryTest`와 새 API HTTP 테스트: 세 타입의 순서·이름, 별도 민감성 이름의 항상 제공,
  개수 필드 없음, 기존 API 호환. `skinType=SENSITIVE`와 프로필 입력의 기존 거절도 유지한다.
- `ProductSelectedFiltersTest`의 핵심 사례를 새 계약 테스트로 전환한다. 다른 조건 때문에
  빠진 브랜드·카테고리, 상품 없는 브랜드, 검색 결과 없음, 없는 ID 단독·정상 ID 혼합을 검증한다.
  선택 이름·0개가 `filterOptions`에 있고 `selectedFilters`는 첫 페이지에도 없음을 확인한다.
- `ProductFilterOptionsTest`와 `ProductSkinTypeFilterTest`: 선택된 타입·민감성의 0개 유지,
  미선택 0개 제외, 민감성 양수/선택된 0개/null, 피부 조건 둘 다 제외한 개수와 목록·count OR 일치.
- 기존 자기 조건 제외 테스트는 응답 전체의 무조건 동등 비교를 수정해야 한다.
  새 계약에서는 선택한 0개 값이 추가되므로, 양수 후보의 ID·개수를 기준 조회와 비교하고
  추가된 0개가 실제 선택(또는 필요한 카테고리 부모)인지 별도로 검증한다.
  검색·성분·유수분 조건 보존 검증을 삭제하지 않는다.
- 카테고리: 부모·자식 동시 선택, 0개 자식과 양수 부모, 0개 자식과 0개 부모,
  부모 단독 선택, 선택하지 않은 0개 형제 제외, 표시 순서와 중복 없음.
- `ProductReadQueriesTest`: 선택한 0개 값까지 포함해 비어 있지 않은 첫 페이지 5회,
  후속 페이지 3회, 비어 있는 후속 페이지 1회 조회 유지. 정의 조회는 후속 페이지에서 생략한다.
- 첫 페이지·후속 페이지·빈 결과 및 마크·나만의 필터 회귀, `ArchitectureTest`를 검증한다.
- 서버 관련 테스트를 먼저 실행하고, 생성물 갱신 후 `sh ./scripts/verify.sh --console=plain`을 통과시킨다.
- 클라이언트 계약 테스트·관련 소비 경계 테스트, 타입 검사·lint를 실행한다.
  소비 코드를 수정할 때는 `client/AGENTS.md`가 지정한 해당 Next.js 로컬 가이드도 먼저 확인한다.

## 구현 진행

- [x] 최신 원격 dev에서 작업 브랜치 생성 및 기존 구현 조사
- [x] 응답·집계·호환성·검증 설계 작성
- [x] 새 피부 선택지 API와 공유 표시 정의
- [x] 선택한 0개 필터 조립과 selectedFilters 제거
- [x] 계약·생성물·목·필수 소비 경계 호환 수정
- [x] 서버·클라이언트 검증 및 후속 UI/배포 연계 확인

## 검증 결과

- 전용 PostgreSQL 17.11의 한글 UTF-8 DB에서 검증했다. 기본 C 로케일은 기존 검색 preflight를
  통과하지 못해 테스트 DB의 로케일을 바로잡았으며, 검색 조건이나 검증 기준은 변경하지 않았다.
- 서버 핵심 테스트 93개 통과. 선택한 0개 항목, 이름·개수, 없는 ID, 목록·count,
  첫 페이지 5회·후속 페이지 3회 조회와 아키텍처 경계를 확인했다.
- `OpenApiContractTest` 13개 통과. 필터 전용 DTO의 필수 개수, 민감성 required+nullable,
  `selectedFilters` 제거, 공용 브랜드·피부 타입 DTO와 enum의 기존 계약을 검증한다.
- `sh ./scripts/verify.sh --console=plain --max-workers=2` 최종 통과.
  생성물 드리프트가 없고 포맷·Checkstyle·전체 빌드가 통과했다.
  서버 267개 suite·2,051개 테스트의 실패·오류·건너뜀은 모두 0개다.
- 기본 build 경로에서는 문서 생성 서버의 기존 60초 기동 제한에 걸렸다.
  성공했던 저장소 밖 build 경로를 전용 Gradle 홈의 임시 init script로 지정해 같은 verify를 통과시켰다.
  원본 의존성 캐시를 재사용했고 저장소의 빌드 설정·검사 항목·제한 시간은 변경하지 않았다.
- 클라이언트 경로 타입 생성·타입 검사 통과. 이전 브랜치의 삭제된 경로를 참조하던
  `.next/dev/types` 캐시는 저장소 밖에 백업하고, 소스나 타입 검사 설정은 변경하지 않았다.
- 클라이언트 관련 7개 파일·151개 테스트 통과. 전체 실행은 247개 파일·2,133개 테스트 중
  가입 화면의 기존 테스트 1개가 5초 제한에 걸렸고 나머지 2,132개는 통과했다.
  해당 파일을 단독 재실행해 7개 모두 통과했으며 테스트와 제한 시간은 바꾸지 않았다.
- 클라이언트 lint 통과(오류 0개, 기존 디자인 토큰 등 경고 53개).
  변경한 클라이언트 파일의 Prettier 검사와 `git diff --check`도 통과했다.
- 검증 로그는 `D:/dev_codex/khyej/.tmp/issue1110/`에 보관한다.
  전용 DB와 이번 작업의 Gradle 데몬은 검증 후 종료했다.

## 후속 범위

홈의 `/api/skin-options` 전환, 칩·태그의 서버 이름 소비, 0개 항목의 화면 표시·개별 해제는
#1079 및 피부 관련 후속 클라이언트 작업이다. 서버 계약 변경과 호환 클라이언트의 배포를 조율해야 한다.

## 코드 리뷰와 리팩터링

- HEAD 대비 working tree의 백엔드 변경과 직접 연결된 생성물·목·소비 경계를 검토했다.
  원본 및 리팩터링 후 독립 리뷰 모두 `No actionable findings`, `correct`이며 confidence는 0.93이다.
  후속으로 합의한 홈·칩·태그 UI 연동은 결함으로 분류하거나 이번 범위로 확장하지 않았다.
- `Facets` 안에서 자식 후보 조립과 부모 개수·포함 여부 결정을 분리했다.
  만들어 둔 `CategoryProductCount`를 다시 열어 포함 여부를 판단하던 흐름 대신,
  소유한 집계와 자식 목록으로 결정한 뒤 최종 조회 결과를 만든다.
  부모·자식 관계 판정은 기존 `Category.isParent`·`isChildOf`에 유지한다.
- 민감성의 0개/선택/null 규칙과 DTO null 변환의 삼항 연산자를 명시적인 if·조기 반환으로 정리했다.
  관련 테스트도 boolean에서 개수로 역변환하지 않고 기대 개수를 직접 검증한다.
- 피부 타입 표시명은 `SkinTypeProductCount.displayName`으로 조회 결과 객체에 직접 요청한다.
  표시명 정의는 기존 `SkinType`이 소유한다. 전달용 record와 DTO 변환에 필요한 접근자는 유지하며,
  HTTP 조립이나 다른 도메인의 정책을 핵심 객체로 옮기지 않는다.
- API·예외·SQL·개수 규칙·표시 순서·조회 횟수는 유지한다. 새로운 도메인 경계나 중복 컬렉션 상태는 만들지 않았다.
- 관련 서버 테스트 97개와 패키지 순환·계층 의존 검사 통과.
  독립 리뷰의 클라이언트 계약·목 테스트 2개 파일·84개 테스트 및 `git diff --check` 통과.
- 리팩터링 후 `sh ./scripts/verify.sh --console=plain --max-workers=2` 통과.
  생성물 드리프트가 없고 포맷·Checkstyle·전체 빌드 및 267개 suite·2,051개 테스트가 통과했다.
  실패·오류·건너뜀은 모두 0개다. 검증 로그는 `refactor-targeted.log`, `refactor-verify.log`에 보관한다.
