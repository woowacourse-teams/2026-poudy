# Backend Architecture

## Architecture goal

Poudy 백엔드는 Spring Web MVC 구조를 사용한다.

`brand`, `category`, `ingredient`, `tag`, `product`, `excludecode`를 각각 기능 모듈로 나누고, 각 모듈 아래에 MVC 구조가 존재하도록 구성한다. Controller와 Service는 얇게 유지하고, 제품 탐색과 같은 문제 해결은 가능한 한 Domain 객체가 담당한다.

MVP의 데이터는 JSON 파일에서 읽는다. Repository는 JSON 파일이라는 저장 방식이 Controller, Service, Domain에 노출되지 않도록 한다. 이후 데이터베이스를 사용하게 되더라도 Repository 부분을 교체할 수 있는 구조를 유지한다.

## Package structure

```text
com.poudy
├── brand
│   ├── controller
│   │   ├── BrandController
│   │   └── dto
│   │       ├── BrandResponse
│   │       ├── BrandDetailResponse
│   │       ├── BrandListItemResponse
│   │       └── BrandListResponse
│   ├── service
│   │   └── BrandService
│   ├── domain
│   │   ├── Brand
│   │   └── Brands
│   └── repository
│       └── BrandRepository
├── category
│   ├── controller
│   │   ├── CategoryController
│   │   └── dto
│   │       ├── CategoryResponse
│   │       ├── CategoryChildResponse
│   │       ├── CategoryListResponse
│   │       └── CategorySummaryResponse
│   ├── service
│   │   └── CategoryService
│   ├── domain
│   │   ├── Category
│   │   └── Categories
│   └── repository
│       └── CategoryRepository
├── ingredient
│   ├── controller
│   │   ├── IngredientController
│   │   └── dto
│   │       ├── IngredientResponse
│   │       ├── IngredientListResponse
│   │       ├── IngredientDetailResponse
│   │       └── IngredientSummaryResponse
│   ├── service
│   │   └── IngredientService
│   ├── domain
│   │   ├── Ingredient
│   │   ├── Ingredients
│   │   ├── IngredientTag
│   │   └── IngredientTags
│   └── repository
│       └── IngredientRepository
├── tag
│   ├── controller
│   │   ├── TagController
│   │   └── dto
│   │       ├── FormulationRoleResponse
│   │       └── SkinEffectResponse
│   ├── service
│   │   └── TagService
│   ├── domain
│   │   ├── FormulationRole
│   │   ├── SkinEffect
│   │   └── TagCategory
│   └── repository
│       └── TagRepository
├── product
│   ├── controller
│   │   ├── ProductController
│   │   └── dto
│   │       ├── ProductFilterRequest
│   │       ├── ProductSortRequest
│   │       ├── ProductPageResponse
│   │       ├── ProductCountResponse
│   │       ├── ProductSuggestionResponse
│   │       ├── ProductSuggestionListResponse
│   │       ├── ProductResponse
│   │       ├── ProductDetailResponse
│   │       ├── ProductIngredientResponse
│   │       └── SkinEffectGroupResponse
│   ├── service
│   │   └── ProductService
│   ├── domain
│   │   ├── Product
│   │   ├── ProductFactory
│   │   ├── Products
│   │   ├── ProductDetail
│   │   ├── ProductFilter
│   │   ├── ProductPage
│   │   ├── ProductSort
│   │   ├── ProductVariant
│   │   ├── ProductVariants
│   │   ├── SkinEffectGroup
│   │   ├── IngredientFilter
│   │   └── sensory
│   │       ├── ProductSensory
│   │       ├── ProductSensoryEstimator
│   │       ├── HeuristicProductSensoryEstimator
│   │       ├── MoistureLevel
│   │       ├── OilLevel
│   │       ├── SensoryConfidence
│   │       └── SensoryModelVersion
│   └── repository
│       └── ProductRepository
├── excludecode
│   ├── controller
│   │   ├── ExcludeCodeController
│   │   └── dto
│   │       ├── ExcludeCodeResponse
│   │       └── ExcludeCodeListResponse
│   ├── domain
│   │   ├── ExcludeCode
│   │   ├── ExcludeCodeMapping
│   │   ├── ExcludeCodeIngredient
│   │   ├── ExcludeCodeIngredients
│   │   └── ResolvedExcludeCode
│   └── repository
│       └── ExcludeCodeRepository
├── storage
│   ├── controller
│   │   ├── StorageController
│   │   └── StorageResponse
│   └── service
│       └── StorageService
├── common
│   ├── domain
│   │   └── SearchKeyword
│   ├── dto
│   │   ├── KeywordRequest
│   │   ├── PaginationRequest
│   │   └── PaginationResponse
│   └── json
│       └── JsonDataReader
├── config
│   ├── OpenApiConfig
│   ├── ExcludeCodeConfig
│   ├── ErrorResponseConfig
│   ├── ErrorResponseCodes
│   └── ProblemDetailResponses
└── exception
    ├── ErrorCode
    ├── GlobalExceptionHandler
    ├── InvalidRequestException
    ├── ResourceNotFoundException
    └── InfrastructureException
```

패키지 구성 규칙은 다음과 같다.

- 기능 모듈은 `controller`, `service`, `domain`, `repository`로 나눈다.
- `storage`처럼 자기 데이터를 갖지 않고 다른 기능의 데이터를 모아 주기만 하는 모듈은 `domain`과 `repository`를 두지 않는다.
- 한 계층에서 DTO가 여러 개 사용되면 해당 계층 아래에 `dto` 디렉터리를 만들고 DTO들을 모은다.
- 실제 구현 중 필요하지 않은 DTO나 Domain 클래스는 만들지 않는다. 위 구조의 이름은 API를 구현할 때 사용할 경계를 보여준다.
- 기능 전용 요청·응답 DTO는 해당 기능의 `controller.dto`에 둔다.
- 다른 기능의 응답에 중첩되는 DTO는 그 개념을 정의하는 기능이 소유하며 다른 기능이 재사용한다. 제품 응답은 `brand.controller.dto.BrandResponse`를 사용한다.
- 페이지네이션처럼 특정 기능에 속하지 않는 횡단 API 계약만 `common.dto`에 둔다.
- 검색어처럼 어느 기능의 개념도 아닌 도메인 값은 `common.domain`에 둔다. 성분과 제품이 같은 검색어 규칙을 쓰는데 한쪽 기능의 `domain`에 두면 다른 기능이 그 기능을 참조하게 되어 의존이 한 방향으로 서지 않는다.
- 공통 예외 처리는 `exception`에, OpenAPI 설정은 `config`에 둔다.

## Dependency direction

기본 요청 흐름은 다음과 같다.

```text
HTTP Request
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
JSON
```

Domain 객체는 Service와 Repository가 사용한다.

- Controller는 HTTP 요청을 받고 응답 DTO를 반환한다.
- Service는 Repository를 호출하고 유스케이스의 흐름만 연결한다.
- Repository는 JSON을 읽어 Domain 객체를 생성하고 반환한다.
- 제품 검색과 필터 판정은 Service나 Repository가 아니라 `Product`와 `Products`가 담당한다.

## Domain model

### Brand

`Brand`는 브랜드 정보를 표현한다. 응답에 싣는 값은 ID, 한글명, 영문명, 이미지 URL 네 가지다. 다른 기능의 응답에 브랜드가 중첩될 때는 모두 같은 `BrandResponse`를 쓴다.

브랜드 목록만 `BrandListItemResponse`로 제품 수를 더해 내려보낸다. `BrandResponse`에 제품 수를 넣으면 제품 카드마다 쓰지 않는 값이 실리고, `ProductPageResponse.brands`에서는 그 수가 결과 기준인지 전체 기준인지 읽는 쪽이 알 수 없다. 목록 항목의 제품 수는 전체 카탈로그 기준이며 제품 조회 필터와 무관하다.

`Brands`는 `List<Brand>`를 가지는 일급 컬렉션이다. 여러 브랜드를 대상으로 하는 문제를 담당한다.

### Category

`Category`는 제품 카테고리를 표현한다. 카테고리 조회 응답은 하위 카테고리를 포함할 수 있다.

`Categories`는 `List<Category>`를 가지는 일급 컬렉션이다. 여러 카테고리를 대상으로 하는 문제를 담당한다.

### Ingredient

`Ingredient`는 성분 정보를 표현한다. API 명세에 따라 이름, 설명, 효과, 정보 출처, 제외 성분군 등의 정보를 가질 수 있으며 여러 `Tag`를 가진다.

`Ingredients`는 `List<Ingredient>`를 가지는 일급 컬렉션이다. 여러 성분을 대상으로 하는 문제를 담당한다.

이름 하나로 성분을 특정할 때는 한글명 완전 일치를 먼저 찾고, 없으면 영문명을 대소문자 없이 맞춘다. 같은 이름을 가진 성분이 여럿이면 ID가 작은 성분을 쓴다. 한 성분의 영문명이 다른 성분의 한글명과 같을 수 있어 순서를 정해 두지 않으면 어느 쪽이 나올지 데이터 순서에 달린다.

성분 검색은 앞뒤 공백을 제거한 검색어로 한글명, 영문명과 별칭을 부분 일치시킨다. 영문명과
영문 별칭은 대소문자를 구분하지 않는다. 결과 건수 상한은 두지 않는다.

결과는 검색어에 얼마나 잘 맞는지로 정렬한다. 이름이 검색어와 정확히 같은 성분, 검색어로
시작하는 성분, 나머지 순이고 같은 등급이면 ID가 작은 성분을 먼저 담는다. 이름으로 걸리지
않고 별칭으로만 걸린 성분은 이름으로 걸린 성분 뒤에 담는다. 이름으로 이미 걸렸다면 별칭이
함께 걸려도 순서를 앞당기지 않는다. 정렬이 없으면 `판`을 친 사용자가 `판테놀` 대신
`메틸프로판다이올`부터 보게 된다.

같은 등급 안에서는 `/`가 들어간 이름을 뒤에 담는다. `글리세린/프탈릭애씨드코폴리머`처럼 `/`로
묶은 이름은 여러 성분을 함께 쓴 혼합물이라 성분 하나를 찾는 검색어의 답으로는 덜 맞다.
`글리세린`을 친 사용자에게는 `글리세린다이메틸에터`를 먼저 보여준다. 등급을 넘어서지는 않아
`/`가 들어가도 검색어로 시작하는 이름이면 검색어를 중간에 품은 이름보다 앞에 담는다.

검색어가 전부 초성 자모면 초성 검색으로 바꾼다. 한글명과 별칭에서 뽑은 초성에 검색어가
들어 있으면 결과에 넣으며, 접두로 한정하지 않는다. 한글 음절이 아닌 문자에서는 초성이
끊긴다. `적색104호의(1)`의 초성은 `ㅈㅅ`와 `ㅎㅇ` 두 토막이라 `ㅈㅅㅎㅇ`로는 찾지 못한다.
숫자를 건너뛰고 이어 붙이면 사람이 읽지 않는 순서로 초성이 생긴다. 영문명은 초성이 없어
걸리지 않는다.

검색어와 비교 대상은 공백을 지우고 맞춘다. 같은 성분을 `리나칸투스 콤무니스추출물`로도
`리나칸투스콤무니스추출물`로도 쓰기 때문이다. 줄바꿈 없는 공백도 공백으로 본다. 초성도 공백을
넘어 이어지지만, 숫자나 기호에서는 그대로 끊긴다.

검색 비교에 쓰는 정규화된 이름과 초성은 기동 시 성분마다 한 번 계산해 둔다. 요청마다 2만 건이
넘는 이름을 다시 정규화하면 검색어가 무엇이든 그 비용이 바닥으로 깔린다. 대신 이름 문자열을
몇 벌 더 들고 있게 되며, 데이터가 메모리에 올라가 있는 지금 구조에서 감당할 수 있는 교환이다.

제품 전성분처럼 성분 목록의 부분집합을 만들 때는 이 값을 다시 계산하지 않고 이미 만들어 둔 것을
물려받는다. `Ingredients.findAllById`가 그 자리다. 부분집합마다 다시 정규화하면 카탈로그가
커질수록 같은 비용이 제품 수만큼 기동 시점에 쌓인다.

검색어는 받는 즉시 NFC로 정규화하고, 분해된 초성 자모(`ᄀ`)를 키보드가 보내는 호환 자모(`ㄱ`)로
맞춘다. 한글은 완성형과 분해형 두 가지로 표현되는데 화면에 같아 보여도 문자열 비교에서는 다르다.
운영 데이터는 전부 완성형이라 분해형으로 들어온 검색어는 정규화하지 않으면 한 건도 걸리지 않는다.

쌍자음은 검색어가 자모 하나일 때만 단자음으로 함께 찾는다. `ㅂ`는 `빨간구슬말추출물`을 찾고,
`ㅂㄱ`는 찾지 못한다. 자모를 여러 개 칠 만큼 이름을 알고 있다면 그 자리의 쌍자음도 정확히
아는 것으로 본다. 쌍자음을 직접 친 `ㅃ`는 단자음을 찾지 않는다. 검색 결과 ID와 상세 조회 ID는 같은 성분 데이터에서
가져온다.

성분 상세의 `infoSources`는 `description_evidence` 전체를 성분 설명 근거로 제공한다.
`effectSources`는 응답에 노출되는 `BIOLOGICAL_EFFECT` 태그 매핑의 `source`만 피부 작용
근거로 제공한다. 기관명이나 출처 제목으로 두 종류를 추론하지 않는다.

두 근거 문자열은 괄호 밖의 세미콜론으로 여러 출처를 구분한다. 태그 매핑의 `source`는 데이터
변환 과정에서 합쳐진 줄바꿈도 출처 경계로 사용한다. 설명 근거의 줄바꿈은 원문의 일부로 보존한다.
논문 저자처럼 괄호 안에 있는 세미콜론은 같은 출처의 일부이므로 보존한다. 피부 작용 근거는 매핑 순서를 유지하며
중복을 제거한다. `태그 보류`로 시작하는 근거는 `tag_mappings`에 저장하지 않고 로딩 시
잘못된 데이터로 간주한다.

### Tag

`Tag`는 성분에 붙는 태그 하나를 표현한다. 하나의 `Ingredient`에는 여러 `Tag`가 붙을 수 있다.

태그는 성격이 다른 두 축으로 나뉘며 응답에서도 따로 싣는다.

| 축 | 응답 필드 | 뜻 | 예 |
| --- | --- | --- | --- |
| CosIng `FUNCTION` | `formulationRoles` | 제형에서 이 성분이 맡는 역할 | 습윤제, 유화제, 보존제, 용제 |
| `BIOLOGICAL_EFFECT` | `skinEffects` | 피부에 기대할 수 있는 작용 | 피부 장벽 관련, 미백 관련, 주름 관련 |

두 이름은 기준을 앞에 둔다. 하나는 제형을, 다른 하나는 피부를 기준으로 한다는 것이 이름에 있어야 나란히 놓았을 때 갈린다. `purposes`와 `effects`처럼 기준이 빠진 이름은 둘 다 "성분이 무엇을 하는가"로 읽혀 구분되지 않는다.

응답 필드를 `functions`로 부르지 않는다. `FUNCTION`은 배합 목적인데 우리말로 "기능"이라 옮기면 피부 작용 쪽으로 읽혀 두 축이 뒤집힌다. 문서와 화면 문구에서도 피부 작용을 "기능"이라 부르지 않는다.

제품 상세의 `skinEffectGroups`는 같은 피부 작용을 기준으로 그 제품의 성분을 묶은 것이다.

`IngredientTags`는 `List<IngredientTag>`를 가지는 일급 컬렉션이다. 한 성분에 붙은 여러 태그를 관리하며 두 축으로 가르는 일과 피부 작용 근거를 모으는 일을 담당한다. 성분에 붙은 태그 목록이므로 `tag`가 아니라 `ingredient.domain`이 소유한다. `tag.domain`에는 두 축의 태그 이름을 정의하는 `FormulationRole`, `SkinEffect`와 원천 데이터의 태그 구분인 `TagCategory`를 둔다.

### Product

`Product`는 제품 하나를 표현한다. 단순히 연관 객체의 ID만 가지는 형태가 아니라 `Brand`, `Category`, `Ingredient` 객체를 직접 가진다.

```text
Product
├── id
├── name
├── Brand
├── Category 객체
├── Ingredients 일급 컬렉션
├── image
├── ProductVariants 일급 컬렉션
│   └── ProductVariant (price, volume, status)
└── ProductSensory
    ├── MoistureLevel
    ├── OilLevel
    ├── SensoryConfidence
    └── SensoryModelVersion
```

제품 하나에 관한 판단은 `Product`가 담당한다. 예를 들어 특정 브랜드나 카테고리에 해당하는지, 특정 성분을 포함하는지, 제외 대상 성분을 포함하는지를 `Product`에 물어보는 형태로 구현한다.

`products.json`에는 `moisture_level`, `oil_level`을 두지 않는다. `ProductFactory`가 해석된
`Category`와 순서가 보존된 `Ingredients`를 `ProductSensoryEstimator`에 전달해 서버 기동 시
한 번 계산하고, 완성된 `ProductSensory`를 `Product`에 넣는다. 목록·상세·filter·count는 모두
그 값을 사용하며 응답 DTO 경계에서만 기존 정수 `0~3` 계약으로 바꾼다. 현재 v0의 근거와
의도적으로 남긴 한계는
[`sensory-inference-v0.md`](docs/product/sensory-inference-v0.md)가 소유한다.

전성분은 `List<Ingredient>`가 아니라 `ingredient.domain`의 `Ingredients`로 갖는다. 여러 성분을 대상으로 하는 문제는 이미 그 일급 컬렉션이 담당하므로, 제품이 성분 목록을 다시 훑는 코드를 갖지 않는다.

가격과 용량은 제품 자체가 아니라 판매 옵션의 값이므로 `ProductVariant`가 갖고, 제품은 하나 이상의 옵션을 `ProductVariants`로 관리한다. 목록 응답과 가격 정렬은 데이터에서 첫 번째로 선언한 대표 옵션을 사용하며 상세 응답은 모든 옵션을 순서대로 제공한다.

성분별 공개 함량은 성분이 아니라 제품과 성분의 관계에 붙는 값이지만 현재 데이터 계약이 정해지지 않았다. 따라서 별도 도메인 값을 만들거나 `products.json`에서 읽지 않으며 상세 응답에서도 비워 둔다. 계약이 확정되면 관계 모델과 매핑 위치를 함께 정한다.

### Products

`Products`는 `List<Product>`를 가지는 일급 컬렉션이다.

제품 검색은 제품명을 성분 검색과 같은 규칙으로 맞춘다. `common.domain`의 `SearchKeyword`, `SearchableText`, `NameRank`를 그대로 쓰므로 NFC 정규화, 공백 흡수, 초성 검색과 결과 정렬이 성분과 같다. 제품명은 `복숭아 70 나이아신 세럼`처럼 숫자가 섞여 있어 초성이 그 자리에서 끊긴다. 성분의 `적색104호의(1)`과 같은 성질이다.

제품 목록 전체에 적용되는 검색, 필터링, 정렬, 개수 계산과 결과 브랜드 수집은 `Products`가 담당한다. 검색어는 다른 필터와 함께 올 수 있으며 같은 `Products`가 한 번에 처리한다. 제품 필터 조회와 제품 개수 조회는 같은 필터 규칙을 사용해야 한다. 목록 응답의 `brands`도 개수와 마찬가지로 페이지가 아니라 조건에 해당하는 결과 전체에서 구한다.

API 명세에 정의된 제품 필터 규칙은 다음과 같다.

- 서로 다른 필터 종류는 AND 조건으로 결합한다.
- 선택한 카테고리 중 하나에 해당하면 포함한다.
- 선택한 수분감과 유분감 조건에 해당해야 한다.
- 포함 성분은 선택한 성분을 모두 포함해야 한다.
- 제외 성분은 선택한 성분 중 하나라도 포함하면 제외한다.
- 제외 성분군은 그 성분군에 속한 성분을 하나라도 포함하면 제외한다.

### ExcludeCode

`ExcludeCode`는 빠른 필터에 쓰는 제외 성분군 하나를 뜻한다. 성분과 개념이 달라 별도 모듈이 소유한다.

제품 조회는 `excludeCodes`로 성분군을 그대로 받는다. 성분군을 성분으로 푸는 일은 서버가 담당한다. 프론트가 `/api/exclude-codes`의 성분 목록을 `excludeIngredientIds`로 펼쳐 보내면 성분군의 구성이 바뀔 때마다 프론트가 보낸 목록이 낡고, 요청 길이도 성분 수만큼 늘어난다.

`/api/exclude-codes`의 `ingredients`는 성분군에 무엇이 속하는지 화면에 보여 주는 용도로 남는다. 필터 요청에는 쓰지 않는다.

`excludeCodes`와 `excludeIngredientIds`는 함께 보낼 수 있고 둘을 합집합으로 판정한다. 포함 성분이 제외 성분군에 속하면 `CONFLICTING_INGREDIENT_FILTER`로 거절한다. 같은 모순을 성분 ID 두 개로 표현하든 성분군으로 표현하든 같은 오류가 나와야 프론트가 "조건에 맞는 제품 없음"과 "잘못된 조건"을 구분할 수 있다.

성분군에 어떤 성분이 속하는지는 `exclude_codes.json`이 갖는다. `ExcludeCodeRepository`가 성분군마다 코드와 성분 ID 목록을 읽고, `ResolvedExcludeCode`가 성분군 하나씩 한 번만 훑어 찾은 성분과 찾지 못한 ID를 함께 돌려준다. 하나라도 찾지 못하면 기동 시점에 실패한다. `IngredientFilter.of`가 이 매핑으로 성분군을 성분으로 풀어 제외 목록에 합친 뒤 포함 성분과 대조하므로, 충돌 판정과 필터 판정 모두 성분 하나를 기준으로 한다.

`ExcludeCode`에는 API 계약이 되는 코드값과 화면 문구만 남는다. 성분 목록을 서버 상수로 들고 있으면 데이터가 성분군 구성을 바꿔도 서버를 고쳐야 배포에 반영된다.

성분군 정의는 코드마다 정확히 하나씩 있어야 하며, 빠지거나 중복되면 기동 시점에 실패한다. 정의가 빠진 성분군은 아무것도 거르지 않는 빠른 필터가 되어 조회 결과만 보고는 알아채지 못한다. 해석은 `ExcludeCode` 선언 순서로 돌아 응답의 성분군 순서와 성분 상세의 `groupCodes` 순서가 데이터 정렬에 흔들리지 않게 하고, 성분군 안의 성분 순서는 데이터가 준 순서를 그대로 쓴다.

빠른 제외 성분군은 다음 6개를 제공한다.

| Code | 표시 이름 | 판정 범위 |
| --- | --- | --- |
| `FRAGRANCE_ALLERGENS` | 향료/알레르기 성분 제외 | 향료와 단독 표기되는 알레르기 유발 향료 성분 |
| `DRYING_ALCOHOLS` | 건조 알코올 제외 | 변성알코올, 에탄올, 이소프로필알코올 등 건조 알코올 |
| `HARSH_PRESERVATIVES` | 자극성 방부제 제외 | 페녹시에탄올, 파라벤 6종, BHA, BHT, DMDM 하이단토인 |
| `SULFATES` | 설페이트 성분 제외 | SLS, SLES, ALS, ALES |
| `CYCLIC_SILICONES` | 실리콘 자극원 제외 | D4, D5, D6와 사이클로메티콘 |
| `SYNTHETIC_COLORANTS` | 합성 색소 제외 | 검토해 승인한 합성 색소 |

`DRYING_ALCOHOLS`에는 세테아릴알코올·스테아릴알코올 같은 지방족 알코올과 페녹시에탄올을 넣지 않는다. 디메치콘은 `CYCLIC_SILICONES`에 넣지 않는다. `HARSH_PRESERVATIVES`의 파라벤은 메틸·에틸·프로필·부틸·아이소부틸·아이소프로필 6종이다. 벤질파라벤은 운영 성분 데이터에 없어 넣으면 기동 시점에 실패한다. 소듐메틸파라벤처럼 염 형태로 따로 등록된 성분은 별개의 성분이므로 담지 않는다. `SYNTHETIC_COLORANTS`는 이전 등록 색소명·CI 판정을 적용해 확인한 색소를 승인 기준으로 삼는다. 패턴이나 CI 코드로 새 성분을 자동 포함하지 않는다. 승인 목록은 이제 데이터 파이프라인의 `빠른 제외 성분군` 시트가 갖고 있으므로 포함 범위를 바꾸는 검토도 그쪽에서 한다. 서버는 목록을 고정하지 않으며 데이터가 준 성분을 그대로 쓴다.

### Storage

보관함은 사용자가 담아 둔 제품 목록이다. 담고 빼는 동작과 목록 자체는 브라우저가 들고 있으며 서버는 저장하지 않는다. 서버는 브라우저가 보낸 제품 ID 목록을 제품 목록 항목과 같은 정보로 채워 돌려주기만 한다.

따라서 `storage`는 자기 Domain과 Repository를 갖지 않고 `Products`에 ID로 조회를 요청한다.

- 제품 ID는 콤마로 이어 붙인 쿼리 파라미터 하나로 받는다. `productIds=101,205` 형태다.
- 받은 ID를 모두 채워 돌려주므로 페이지를 나누지 않는다. 개수 상한도 두지 않는다.
- 요청한 ID 순서를 그대로 유지한다. 보관함의 정렬은 브라우저가 정한다.
- 찾지 못한 ID는 오류가 아니라 결과에서 빠진다. 브라우저에 남은 목록이 서버 데이터와 어긋날 수 있다.

## Offline catalog audit boundary

`src/offlineTools/java`는 서버 애플리케이션과 분리된 Gradle source set이다. 여기의 도구는
외부 카탈로그를 읽어 품질·커버리지 보고서를 만들지만 `main` source set이나 Boot artifact에
포함되지 않는다. 런타임 Repository의 fail-fast 역직렬화를 감사에 재사용하지 않는다. 감사
대상은 바로 그 역직렬화 계약에 맞지 않는 누락·중복·미해결 원천 레코드를 중단하지 않고
누적해야 하기 때문이다.

`catalogSensoryReadinessReport`는 명시한 외부 디렉터리의 `products.json`,
`ingredients.json`, `categories.json`만 읽는다. 원본을 저장소나 runtime classpath로 복사하지
않고 다음 두 파생 보고서만 만든다.

```text
catalog-sensory-readiness-report.json
catalog-sensory-readiness-report.md
```

보고서에는 입력 내용의 SHA-256, 보고서 schema·도구 버전과 결정적으로 정렬된 집계를 넣고,
절대 경로와 현재 시각은 넣지 않는다. 같은 byte 입력과 같은 버전이면 byte-identical 출력이어야
한다. v3 보고서는 runtime과 같은 `ProductSensoryEstimator`로 계산한 전체·category별 레벨과
confidence 집계도 포함하고, 명시적 v0 축 신호·함량 근거 전 보류·아직 미검토인 빈출 성분을
구분한다. 제품별 결과와 원본 JSON은 보존하지 않는다. 데이터 품질 결함은 보고할 대상이므로
정상 종료하고, 필수 파일 누락·파싱 실패·최상위 계약 위반은 기존 출력 쌍을 보존한 채 실패한다.

모델 변경 전에는 `catalogSensoryModelSnapshot`으로 제품 ID·category ID·수분감·유분감·
confidence만 담은 baseline을 저장소 밖에 만든다. 변경 후 `catalogSensoryModelDiff`는 세 catalog
입력의 파일명·크기·SHA-256과 제품 ID 집합·category가 모두 같을 때만 비교한다. 단계별 이동과
2단계 이상 이동 수, confidence 변화를 제품 ID 단위로 출력하되 제품명·전성분·원본은 싣지 않는다.
결과가 바뀌었는데 다섯 모델 구성 버전이 그대로면 실패한다. snapshot과 diff는 검수용 외부
산출물이며 커밋하거나 runtime classpath에 넣지 않는다.

실데이터가 없는 CI는 보고서 실행을 요구하지 않는다. `offlineTools` 컴파일과 fixture 기반
테스트·정적 검사는 일반 `build`에 포함해 도구 자체의 드리프트는 CI에서 잡는다. 감각 원천
문서와 normalized observation의 별도 경계는
[`sensory-source-data-contract.md`](docs/product/sensory-source-data-contract.md)가 소유한다.

## Layer responsibilities

### Controller

Controller는 다음 역할만 담당한다.

- HTTP 경로와 파라미터를 받는다.
- 요청 DTO를 Service에 전달한다.
- Service의 결과를 응답 DTO로 변환하여 반환한다.

Controller에는 제품 검색과 필터 같은 도메인 규칙을 작성하지 않는다.

### Service

Service는 얇게 유지한다.

- Repository의 조회 메서드를 호출한다.
- 조회한 Domain 객체에 필요한 동작을 요청한다.
- Controller에 전달할 결과를 반환한다.

MVP에서는 Repository가 생성한 Domain 객체를 조회하고 제공하는 흐름이 대부분이다. 도메인에서 해결할 수 있는 문제를 Service에 구현하지 않는다.

### Domain

Domain은 데이터만 보관하는 객체로 제한하지 않는다. 자신의 상태와 관련된 판단과 계산을 직접 수행한다.

- `Product`는 제품 하나에 대한 규칙을 담당한다.
- `Products`는 제품 목록 전체에 대한 규칙을 담당한다.
- `Brands`, `Categories`, `Ingredients`, `IngredientTags`는 각 도메인의 목록 전체에 대한 규칙을 담당한다.

Domain은 Repository를 참조하지 않는다. 다른 기능의 데이터가 있어야 세울 수 있는 도메인 객체는 Repository가 돌려준 Domain 객체를 생성자로 받고, 그 조립만 `config`가 맡는다. `ExcludeCodeIngredients`가 `Ingredients`와 성분군 정의를 받고 `ExcludeCodeConfig`가 조립하는 것이 그 경우다. 도메인이 Repository를 직접 부르면 저장소 교체가 도메인까지 번지고, 도메인 테스트가 스프링 컨텍스트를 필요로 하게 된다.

같은 이유로 Repository도 다른 기능의 Repository를 참조하지 않는다. `IngredientConfig`가 `Ingredients`를 빈으로 내놓고, `ProductRepository`와 `ExcludeCodeConfig`는 그 값을 받는다. 기능 사이의 의존이 저장소가 아니라 도메인 값을 향해야 저장소 교체가 다른 기능으로 번지지 않는다.

### Repository

Repository는 JSON 데이터를 읽고 Domain 객체를 생성한다. Controller에 전달할 응답 DTO를 만들거나 제품 필터 규칙을 구현하지 않는다.

파일을 열고 파싱하는 부분은 Repository마다 같으므로 `common.json.JsonDataReader`가 맡는다. Repository는 자기 파일 이름과 도메인 타입만 넘긴다. 파일을 두는 위치, snake_case 변환, `{"<파일명>": [ … ]}` 최상위 필드 해제는 모두 Reader가 처리한다. 최상위 필드 이름은 확장자를 뗀 파일 이름과 같아야 한다. Reader는 데이터 파일 전용 `ObjectMapper`를 쓰므로 이 설정이 HTTP 응답 직렬화에 영향을 주지 않는다.

운영 JSON은 저장소에 커밋하지 않는다. OpenAPI 생성은 데이터 내용이 아니라 애플리케이션 기동만
필요하므로, 깨끗한 CI에서도 재현되도록 `forkedSpringBootRun`이 커밋된 테스트 fixture를 우선하는
test runtime classpath로 실행된다. 실제 서버 실행은 계속 main resources의 운영 JSON을 사용한다.

형식만 옮기는 중간 타입은 두지 않는다. 파일 모양과 도메인 모양이 다를 때도 마찬가지다. `Product`는 `Brand`, `Category`, `Ingredients`를 갖는데 `products.json`은 이들을 ID로 적는다. 이때 파일 모양을 받는 타입을 새로 만들지 않고, `readList`에 역직렬화 규칙을 함께 넘겨 Jackson이 읽으면서 ID를 도메인 객체로 바꾸게 한다. 데이터베이스에서 조인이 매핑 단계에서 끝나고 애플리케이션이 행 타입을 따로 갖지 않는 것과 같다.

그 규칙은 `ProductRepository`가 주입받은 `Brands`, `Categories`, `Ingredients`를 그대로 써서 저장소 안에서 만든다. 새 파일 모양 타입을 두지 않으며, `JsonDataReader`는 규칙을 받기만 하므로 어느 기능의 도메인도 알지 않는다. 각 참조를 찾는 규칙은 해당 일급 컬렉션이 갖는다. 참조 해석이 끝나면 Repository가 주입받은 `ProductFactory`에 완전한 제품 생성을 위임한다. Factory는 순수 Domain 서비스이며 Repository나 JSON을 알지 않는다.

기본 매핑은 Jackson이 도메인 레코드를 직접 만들기 때문에 도메인 필드 이름이 파일과의 계약이 된다. 파일 모양과 도메인 모양이 다른 `Product`는 `ProductRepository`의 전용 역직렬화 규칙이 JSON 필드와 조립 과정을 명시한다. 어느 방식이든 필드 계약 변경은 컴파일로 잡히지 않을 수 있으므로, 각 데이터 파일은 `src/test/resources`의 작은 픽스처로 매핑을 검증한다.

현재 Repository 인터페이스는 만들지 않는다. 이후 데이터베이스 저장소로 교체하는 작업을 시작할 때 Service와 Repository 사이의 인터페이스를 함께 결정한다.

### Exception handling

`GlobalExceptionHandler`가 모든 오류 응답을 RFC 9457 `ProblemDetail` 형태로 반환한다. `ResponseEntityExceptionHandler`를 상속해 프레임워크가 던지는 예외는 기반 클래스가 처리하고, 응답 계약에 필요한 `code`와 문구만 덧입힌다.

- `exception` 패키지의 커스텀 예외는 `InvalidRequestException`, `ResourceNotFoundException`, `InfrastructureException` 세 가지다. 이 셋은 HTTP 상태로 옮기는 분류이며 `ErrorCode`가 대상을 구분한다.
- 도메인 규칙 위반은 그 규칙을 가진 도메인이 자기 예외를 직접 던지고, 그 예외는 도메인 패키지에 둔다. `IngredientFilter`의 `ConflictingIngredientFilterException`과 `IngredientTag`의 `DeferredTagEvidenceException`이 그렇다. 도메인은 `ErrorCode`를 알지 않으며, 요청 계층이 그 예외를 오류 코드로 옮긴다.
- 대상이 제품인지 브랜드인지 성분인지는 예외 타입이 아니라 예외가 들고 있는 `ErrorCode`가 구분한다.
- `HttpStatus`는 `GlobalExceptionHandler`에만 둔다. 커스텀 예외와 `ErrorCode`는 상태를 모른다.
- `InfrastructureException`의 원인 메시지는 로그로만 남기고 응답에 싣지 않는다.

## Data flow

### List and count

```text
Request DTO
    ↓
Service가 Repository에서 Products 조회
    ↓
Products가 동일한 조건으로 목록 또는 개수 계산
    ↓
Response DTO
```

제품 목록 조회와 제품 필터 결과 개수 조회가 서로 다른 필터 구현을 갖지 않도록 한다.

### Detail

```text
Path Parameter
    ↓
Service가 Repository 조회 메서드 호출
    ↓
Product, Brand 또는 Ingredient 반환
    ↓
Detail Response DTO
```

## External interfaces

Controller와 생성된 OpenAPI 문서가 제공하는 조회 API는 다음과 같다.

| Module | Method | Endpoint | Description |
| --- | --- | --- | --- |
| product | GET | `/api/products` | 제품 조회 (검색 또는 필터) |
| product | GET | `/api/products/count` | 제품 조회 결과 개수 조회 |
| product | GET | `/api/products/suggestions` | 제품 검색 제안 조회 |
| product | GET | `/api/products/{productId}` | 제품 상세 조회 |
| storage | GET | `/api/storage` | 보관함 제품 조회 |
| excludecode | GET | `/api/exclude-codes` | 제외 성분군 조회 (빠른 필터) |
| category | GET | `/api/categories` | 카테고리 조회 |
| brand | GET | `/api/brands` | 브랜드 조회 |
| brand | GET | `/api/brands/{brandId}` | 브랜드 상세 조회 (제품 카테고리 포함) |
| ingredient | GET | `/api/ingredients` | 성분 검색 |
| ingredient | GET | `/api/ingredients/{ingredientId}` | 성분 상세 조회 |

제품 하나만 조회하는 엔드포인트는 상세 조회뿐이다. 목록 항목과 같은 `ProductResponse`가 필요한 곳은 필터 조회, 검색, 보관함이며 셋 다 여러 건을 한 번에 반환한다.

검색어도 제품 목록을 좁히는 조건이므로 검색과 필터는 리소스를 나누지 않고 `/api/products` 하나를 쓴다. 경로에 `search` 같은 동사를 두면 리소스가 아닌 것을 리소스처럼 표현하게 된다.

검색어는 다른 필터와 같은 자격의 조건이므로 함께 보낼 수 있고, 다른 필터 종류와 마찬가지로 AND로 결합한다. Controller는 `/api/products`의 GET을 메서드 하나로 받고 `keyword` 유무로 나누지 않는다.

목록은 필터 필드를 가진 `ProductFilterRequest`를 그대로 받는다. 검색어만 담은 별도 DTO를 쓰면 함께 온 필터가 바인딩되지 않아 조용히 무시되고, 조건이 걸리지 않은 결과가 걸린 결과처럼 내려간다.

`/api/products`와 `/api/products/count`는 같은 요청 DTO를 같은 순서로 검사한다. 성분 필터 모순은 `CONFLICTING_INGREDIENT_FILTER`로, 빈 검색어는 `INVALID_QUERY_PARAMETER`로 거절한다. 조건을 하나도 보내지 않은 요청은 전체 목록 조회로 받는다.

- `/api/products`는 검색어와 필터 조건으로 고른 `ProductResponse` 목록을 페이지 단위로 반환하고, 조건에 해당하는 제품 전체의 브랜드를 함께 싣는다.
- `/api/storage`는 콤마로 구분해 받은 `productIds`에 해당하는 `ProductResponse` 목록을 페이지 없이 전부 반환한다.
- `/api/products/{productId}`는 카테고리, 효능과 전체 성분을 포함하는 `ProductDetailResponse`를 반환한다.

`/api/products/count`와 `/api/products/suggestions`는 `/api/products/{productId}`와 같은 자리를 쓴다. 고정 문자열이 경로 변수보다 먼저 매칭되고 두 이름 모두 제품 ID로 올 수 없으므로 문제가 없다. 제품 아래에 고정 경로를 더 만들 때는 그 이름이 제품 ID로 올 수 없는지 확인한다.

제품 검색 제안은 `/api/products`와 경로를 나눈다. 같은 검색어를 받지만 돌려주는 표현이 다르기 때문이다. 목록은 페이지와 브랜드를 포함한 `ProductResponse`를 주고, 제안은 입력 중 띄울 후보라 ID와 이름, 이미지, 브랜드 이름만 준다. 한 경로에서 표현을 파라미터로 가르면 응답 타입이 요청에 따라 달라져 생성된 타입이 둘을 구분하지 못한다.

### API contract generation

Controller, DTO와 OpenAPI 설정 코드가 API 계약의 권위 원천이다. `./gradlew generateApiArtifacts`가 다음 생성물을 갱신한다.

| Output | Role |
| --- | --- |
| `server/openapi.json` | OpenAPI 문서 |
| `common/api.zod.ts` | 프론트엔드용 Zod 스키마와 타입 |
| `common/api.zod.types.d.ts` | 생성 타입 선언 |

생성물은 직접 수정하지 않는다. 계약이 바뀌면 생성 작업을 실행해 함께 커밋한다.

## Architecture rules

1. `brand`, `category`, `ingredient`, `tag`, `product`, `excludecode` 각각에 MVC 구조를 둔다. `storage`는 자기 데이터가 없어 Domain과 Repository를 두지 않는다.
2. Controller와 Service는 얇게 유지한다.
3. 문제 해결은 가능한 한 Domain 객체가 담당한다.
4. `Products`는 `List<Product>`를 갖는 일급 컬렉션이다.
5. `Product`는 Brand, Category, Ingredient의 ID만 갖지 않고 객체를 직접 갖는다.
6. 제품 조회와 count 조회는 같은 필터 규칙을 사용한다. 둘 다 검색어와 필터를 함께 받는다.
7. Repository는 JSON을 읽어 Domain 객체를 생성한다.
8. 저장 방식은 Repository 밖으로 노출하지 않는다.
9. DTO가 여러 개 존재하는 계층에만 `dto` 디렉터리를 둔다.
10. `Ingredient`는 여러 `IngredientTag`를 가지며, 여러 태그는 `IngredientTags`로 관리한다. 태그는 배합 목적과 피부 작용 두 축으로 나누어 싣는다.
11. 외부 API의 기본 경로는 `/api`다.
12. 제품 조회와 보관함은 같은 `ProductResponse`를 쓴다. 제품 상세와 검색 제안만 별도 엔드포인트와 응답 DTO를 사용한다.
13. 검색과 필터는 경로도 Controller 메서드도 나누지 않는다. 검색어는 다른 필터와 함께 보낼 수 있고 AND로 결합한다.
14. 요청 규칙은 `@ModelAttribute` 바인딩에서 끝낸다. Controller는 검사 메서드를 호출하지 않고, 횡단 필터나 인터셉터도 두지 않는다. 값 하나로 끝나는 규칙은 Bean Validation 애노테이션에, 여러 값을 함께 봐야 하는 규칙은 클래스 레벨 커스텀 제약에 둔다. `ConflictingIngredientFilter`가 후자이며 `ExcludeCodeIngredients`를 주입받아 판정을 도메인에 넘긴다.
15. 바인딩 검증 실패는 모두 400이라 상태만으로 구분되지 않는다. 전용 코드가 필요한 커스텀 제약은 `message`에 `ErrorCode` 이름을 적고, `GlobalExceptionHandler`가 위반 문구에서 그 이름으로 코드를 되찾는다. 이름이 없으면 `INVALID_QUERY_PARAMETER`다. 이 방식이라야 `exception` 패키지가 기능 패키지를 참조하지 않는다.
16. 기능 전용 요청·응답 DTO는 해당 기능의 `controller.dto`에 둔다.
17. 특정 기능에 속하지 않는 횡단 API 계약만 `common.dto`에, 여러 기능이 공유하는 도메인 값은 `common.domain`에 둔다.
18. 오류 응답은 `ProblemDetail`로 반환하며 `HttpStatus` 매핑은 `GlobalExceptionHandler`에만 둔다.
19. API 계약이 바뀌면 OpenAPI와 TypeScript 생성물을 함께 갱신한다.
20. 접근 제어자를 생략하지 않는다. 기본 접근에 기대는 대신 `public` 또는 `private`을 적는다.
21. `offlineTools`는 명시한 외부 입력만 읽고 Boot artifact에 포함하지 않는다. 원본을
    runtime classpath로 복사하지 않으며, 같은 입력·도구 버전의 보고서는 결정적이어야 한다.
22. 제품 감각은 원천 JSON의 완성 레벨이 아니라 기동 시 `ProductFactory`가 계산한다. 런타임
    `Product`는 버전과 confidence를 포함한 `ProductSensory`를 소유하고 API는 기존 정수 레벨을
    유지한다.
