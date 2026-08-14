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
│   │       ├── IngredientSummaryResponse
│   │       └── EffectResponse
│   ├── service
│   │   └── IngredientService
│   ├── domain
│   │   ├── Ingredient
│   │   └── Ingredients
│   └── repository
│       └── IngredientRepository
├── tag
│   ├── controller
│   │   ├── TagController
│   │   └── TagResponse
│   ├── service
│   │   └── TagService
│   ├── domain
│   │   ├── Tag
│   │   └── Tags
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
│   │       ├── ProductResponse
│   │       ├── ProductDetailResponse
│   │       ├── ProductIngredientResponse
│   │       └── BenefitResponse
│   ├── service
│   │   └── ProductService
│   ├── domain
│   │   ├── Product
│   │   ├── Products
│   │   ├── ProductSort
│   │   └── IngredientFilter
│   └── repository
│       └── ProductRepository
├── excludecode
│   ├── controller
│   │   ├── ExcludeCodeController
│   │   └── dto
│   │       ├── ExcludeCodeResponse
│   │       └── ExcludeCodeListResponse
│   └── domain
│       └── ExcludeCode
├── storage
│   ├── controller
│   │   ├── StorageController
│   │   └── StorageResponse
│   └── service
│       └── StorageService
├── common
│   └── dto
│       ├── PaginationRequest
│       └── PaginationResponse
├── config
│   ├── OpenApiConfig
│   └── ErrorResponseConfig
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

`Brand`는 브랜드 정보를 표현한다. 응답에 싣는 값은 ID, 한글명, 영문명, 이미지 URL 네 가지다. 브랜드를 참조하는 모든 응답이 같은 `BrandResponse`를 쓴다.

`Brands`는 `List<Brand>`를 가지는 일급 컬렉션이다. 여러 브랜드를 대상으로 하는 문제를 담당한다.

### Category

`Category`는 제품 카테고리를 표현한다. 카테고리 조회 응답은 하위 카테고리를 포함할 수 있다.

`Categories`는 `List<Category>`를 가지는 일급 컬렉션이다. 여러 카테고리를 대상으로 하는 문제를 담당한다.

### Ingredient

`Ingredient`는 성분 정보를 표현한다. API 명세에 따라 이름, 설명, 효과, 정보 출처, 제외 성분군 등의 정보를 가질 수 있으며 여러 `Tag`를 가진다.

`Ingredients`는 `List<Ingredient>`를 가지는 일급 컬렉션이다. 여러 성분을 대상으로 하는 문제를 담당한다.

### Tag

`Tag`는 성분에 붙는 태그 하나를 표현한다. 하나의 `Ingredient`에는 여러 `Tag`가 붙을 수 있다.

`Tags`는 `List<Tag>`를 가지는 일급 컬렉션이다. 한 성분에 붙은 여러 태그를 관리한다.

### Product

`Product`는 제품 하나를 표현한다. 단순히 연관 객체의 ID만 가지는 형태가 아니라 `Brand`, `Category`, `Ingredient` 객체를 직접 가진다.

```text
Product
├── id
├── name
├── Brand
├── Category 객체
├── Ingredient 객체 목록
├── image
├── price
├── volume
├── moisture level
└── oil level
```

제품 하나에 관한 판단은 `Product`가 담당한다. 예를 들어 특정 브랜드나 카테고리에 해당하는지, 특정 성분을 포함하는지, 제외 대상 성분을 포함하는지를 `Product`에 물어보는 형태로 구현한다.

### Products

`Products`는 `List<Product>`를 가지는 일급 컬렉션이다.

제품 목록 전체에 적용되는 검색, 필터링, 정렬, 개수 계산과 결과 브랜드 수집은 `Products`가 담당한다. 검색과 필터는 Controller 메서드가 나뉘어 있을 뿐 같은 `Products`가 처리한다. 제품 필터 조회와 제품 개수 조회는 같은 필터 규칙을 사용해야 한다. 목록 응답의 `brands`도 개수와 마찬가지로 페이지가 아니라 조건에 해당하는 결과 전체에서 구한다.

API 명세에 정의된 제품 필터 규칙은 다음과 같다.

- 서로 다른 필터 종류는 AND 조건으로 결합한다.
- 선택한 카테고리 중 하나에 해당하면 포함한다.
- 선택한 수분감과 유분감 조건에 해당해야 한다.
- 포함 성분은 선택한 성분을 모두 포함해야 한다.
- 제외 성분은 선택한 성분 중 하나라도 포함하면 제외한다.

### ExcludeCode

`ExcludeCode`는 빠른 필터에 쓰는 제외 성분군 하나를 뜻한다. 성분과 개념이 달라 별도 모듈이 소유한다.

제품 조회는 성분군을 받지 않는다. 프론트가 `/api/exclude-codes`로 각 성분군의 성분을 받아, 고른 성분군을 `excludeIngredientIds`로 펼쳐 보낸다. 서버가 성분군을 다시 성분으로 푸는 경로를 두지 않으므로 필터 판정은 성분 하나로 일원화된다.

빠른 제외 성분군은 다음 6개를 제공한다.

| Code | 표시 이름 | 판정 범위 |
| --- | --- | --- |
| `FRAGRANCE_ALLERGENS` | 향료/알레르기 성분 제외 | 향료와 단독 표기되는 알레르기 유발 향료 성분 |
| `DRYING_ALCOHOLS` | 건조 알코올 제외 | 변성알코올, 에탄올, 이소프로필알코올 등 건조 알코올 |
| `HARSH_PRESERVATIVES` | 자극성 방부제 제외 | 페녹시에탄올, 파라벤 7종, BHA, BHT, DMDM 하이단토인 |
| `SULFATES` | 설페이트 성분 제외 | SLS, SLES, ALS, ALES |
| `CYCLIC_SILICONES` | 실리콘 자극원 제외 | D4, D5, D6와 사이클로메티콘 |
| `SYNTHETIC_COLORANTS` | 합성 색소 제외 | 등록된 타르색소와 `X색O호` 형식의 합성 색소 |

`DRYING_ALCOHOLS`에는 세테아릴알코올·스테아릴알코올 같은 지방족 알코올과 페녹시에탄올을 넣지 않는다. 디메치콘은 `CYCLIC_SILICONES`에 넣지 않는다. `SYNTHETIC_COLORANTS`는 등록된 성분 ID뿐 아니라 원천 데이터를 정규화할 때 `X색O호` 이름 패턴과 CI 코드도 함께 판정한다.

### Storage

보관함은 사용자가 담아 둔 제품 목록이다. 담고 빼는 동작과 목록 자체는 브라우저가 들고 있으며 서버는 저장하지 않는다. 서버는 브라우저가 보낸 제품 ID 목록을 제품 목록 항목과 같은 정보로 채워 돌려주기만 한다.

따라서 `storage`는 자기 Domain과 Repository를 갖지 않고 `Products`에 ID로 조회를 요청한다.

- 제품 ID는 콤마로 이어 붙인 쿼리 파라미터 하나로 받는다. `productIds=101,205` 형태다.
- 받은 ID를 모두 채워 돌려주므로 페이지를 나누지 않는다. 개수 상한도 두지 않는다.
- 요청한 ID 순서를 그대로 유지한다. 보관함의 정렬은 브라우저가 정한다.
- 찾지 못한 ID는 오류가 아니라 결과에서 빠진다. 브라우저에 남은 목록이 서버 데이터와 어긋날 수 있다.

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
- `Brands`, `Categories`, `Ingredients`, `Tags`는 각 도메인의 목록 전체에 대한 규칙을 담당한다.

### Repository

Repository는 JSON 데이터를 읽고 Domain 객체를 생성한다. Controller에 전달할 응답 DTO를 만들거나 제품 필터 규칙을 구현하지 않는다.

현재 Repository 인터페이스는 만들지 않는다. 이후 데이터베이스 저장소로 교체하는 작업을 시작할 때 Service와 Repository 사이의 인터페이스를 함께 결정한다.

### Exception handling

`GlobalExceptionHandler`가 모든 오류 응답을 RFC 9457 `ProblemDetail` 형태로 반환한다. `ResponseEntityExceptionHandler`를 상속해 프레임워크가 던지는 예외는 기반 클래스가 처리하고, 응답 계약에 필요한 `code`와 문구만 덧입힌다.

- 커스텀 예외는 `InvalidRequestException`, `ResourceNotFoundException`, `InfrastructureException` 세 가지다.
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
| product | GET | `/api/products/{productId}` | 제품 상세 조회 |
| storage | GET | `/api/storage` | 보관함 제품 조회 |
| excludecode | GET | `/api/exclude-codes` | 제외 성분군 조회 (빠른 필터) |
| category | GET | `/api/categories` | 카테고리 조회 |
| brand | GET | `/api/brands` | 브랜드 조회 |
| brand | GET | `/api/brands/{brandId}` | 브랜드 상세 조회 (제품 카테고리 포함) |
| ingredient | GET | `/api/ingredients/suggestions` | 성분 추천 검색어 |
| ingredient | GET | `/api/ingredients/{ingredientId}` | 성분 기본 조회 |
| ingredient | GET | `/api/ingredients/detail/{ingredientId}` | 성분 상세 조회 |

제품 하나만 조회하는 엔드포인트는 상세 조회뿐이다. 목록 항목과 같은 `ProductResponse`가 필요한 곳은 필터 조회, 검색, 보관함이며 셋 다 여러 건을 한 번에 반환한다.

검색어도 제품 목록을 좁히는 조건이므로 검색과 필터는 리소스를 나누지 않고 `/api/products` 하나를 쓴다. 경로에 `search` 같은 동사를 두면 리소스가 아닌 것을 리소스처럼 표현하게 된다.

대신 목록은 둘을 섞은 요청을 받지 않는다. Controller는 `@GetMapping(params = "keyword")`와 `params = "!keyword"`로 메서드를 나누고, 검색 쪽은 `ProductFilterRequest.validateSearchOnly()`로 필터 조건이 함께 왔는지 확인해 `CONFLICTING_SEARCH_AND_FILTER`로 거절한다.

검색 메서드도 필터 필드를 가진 `ProductFilterRequest`를 그대로 받는다. 검색어만 담은 별도 DTO를 쓰면 함께 온 필터가 바인딩되지 않아 조용히 무시되고, 조건이 걸리지 않은 결과가 걸린 결과처럼 내려간다.

규칙을 `keyword` 유무로 가르는 매핑 조건에만 맡기지 않고 오류 코드로 드러내는 이유는, `ProblemDetail`의 `code` enum이 생성물을 통해 프론트까지 전달되기 때문이다. OpenAPI 파라미터로 표현할 수 없는 규칙을 프론트가 읽을 수 있는 자리가 여기뿐이다.

`/api/products/count`는 나누지 않는다. 개수는 검색어와 필터를 함께 걸어도 답할 수 있어야 한다.

OpenAPI의 쿼리 파라미터에는 배타 관계를 적을 문법이 없다. 그래서 이 규칙은 파라미터 스키마가 아니라 오퍼레이션 설명과 400 응답의 `CONFLICTING_SEARCH_AND_FILTER` 예시로만 드러난다.

OpenAPI는 한 경로의 GET을 오퍼레이션 하나로만 표현한다. 두 메서드는 문서에서 하나로 합쳐지므로 `@Operation`을 같게 두어, 병합에서 어느 쪽이 이기든 같은 문서가 나오게 한다. 파라미터는 합쳐진 목록으로 실리며, 함께 쓸 수 없다는 규칙은 설명으로만 남는다.

- `/api/products`는 검색어 또는 필터 조건으로 고른 `ProductResponse` 목록을 페이지 단위로 반환하고, 조건에 해당하는 제품 전체의 브랜드를 함께 싣는다.
- `/api/storage`는 콤마로 구분해 받은 `productIds`에 해당하는 `ProductResponse` 목록을 페이지 없이 전부 반환한다.
- `/api/products/{productId}`는 카테고리, 효능과 전체 성분을 포함하는 `ProductDetailResponse`를 반환한다.

`/api/products/count`는 `/api/products/{productId}`와 같은 자리를 쓴다. 고정 문자열이 경로 변수보다 먼저 매칭되므로 지금은 문제가 없지만, 제품 아래에 고정 경로를 더 만들 때는 그 이름이 제품 ID로 올 수 없는지 확인한다.

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
6. 제품 조회와 count 조회는 같은 필터 규칙을 사용한다. 다만 목록은 검색어와 필터를 함께 받지 않고, count는 함께 받는다.
7. Repository는 JSON을 읽어 Domain 객체를 생성한다.
8. 저장 방식은 Repository 밖으로 노출하지 않는다.
9. DTO가 여러 개 존재하는 계층에만 `dto` 디렉터리를 둔다.
10. `Ingredient`는 여러 `Tag`를 가지며, 여러 태그는 `Tags`로 관리한다.
11. 외부 API의 기본 경로는 `/api`다.
12. 제품 조회와 보관함은 같은 `ProductResponse`를 쓰고, 제품 상세 조회만 별도 엔드포인트와 응답 DTO를 사용한다.
13. 검색과 필터는 경로를 나누지 않고 `keyword` 유무로 Controller 메서드를 나눈다. 목록에서 둘을 함께 보낸 요청은 `CONFLICTING_SEARCH_AND_FILTER`로 거절한다.
14. 요청 규칙은 `@ModelAttribute`로 받는 요청 DTO가 스스로 검사한다. 횡단 필터나 인터셉터를 두지 않는다.
15. 기능 전용 요청·응답 DTO는 해당 기능의 `controller.dto`에 둔다.
16. 특정 기능에 속하지 않는 횡단 API 계약만 `common.dto`에 둔다.
17. 오류 응답은 `ProblemDetail`로 반환하며 `HttpStatus` 매핑은 `GlobalExceptionHandler`에만 둔다.
18. API 계약이 바뀌면 OpenAPI와 TypeScript 생성물을 함께 갱신한다.
