# Backend Architecture

## Current status

현재 백엔드는 Controller와 API 요청·응답 DTO를 먼저 정의한 단계다. Controller는 실제
데이터를 조회하지 않고 명세 확인을 위한 샘플 응답을 반환한다.

Service, Repository, JSON 데이터 로딩과 주요 Domain 모델은 아직 구현하지 않았다. 따라서
해당 계층이 없는 상태를 구조 위반으로 보지 않으며, 실제 기능을 구현할 때 필요한 경계를
결정한다. 사용하지 않는 빈 클래스나 인터페이스를 구조만 맞추기 위해 미리 만들지 않는다.

## Current package structure

기능별 패키지 아래에 계층을 두고, 요청·응답 DTO는 이를 사용하는 Controller 계층에
둔다.

```text
com.poudy
├── brand
│   ├── controller
│   │   ├── BrandController
│   │   └── dto
├── category
│   ├── controller
│   │   ├── CategoryController
│   │   └── dto
├── ingredient
│   ├── controller
│   │   ├── IngredientController
│   │   └── dto
│   ├── domain
│   │   └── ExcludeCode
├── product
│   ├── controller
│   │   ├── ProductController
│   │   └── dto
│   ├── domain
│   │   └── ProductSort
├── common
│   └── dto
│       ├── PaginationRequest
│       └── PaginationResponse
├── config
└── exception
```

패키지 구성 규칙은 다음과 같다.

- 기능 전용 요청·응답 DTO는 `<feature>.controller.dto`에 둔다.
- API 응답에 중첩되는 DTO는 해당 개념을 정의하는 기능이 소유하며 다른 기능이 재사용할 수
  있다. 예를 들어 제품 응답은 `brand.controller.dto.BrandSummaryResponse`를 사용한다.
- 페이지네이션처럼 특정 기능에 속하지 않는 횡단 API 계약만 `common.dto`에 둔다.
- Controller, Service, Domain, Repository는 구현되는 시점에 기능 패키지 아래의 각 계층
  패키지에 둔다.
- 아직 사용하지 않는 계층이나 타입은 만들지 않는다.

## Current dependency direction

현재 요청 흐름은 다음과 같다.

```text
HTTP Request
    ↓
Controller
    ↓
Request·Response DTO와 샘플 응답
```

- Controller는 HTTP 경로, 파라미터와 Bean Validation 적용 위치를 정의한다.
- DTO는 외부 API의 요청·응답 계약을 표현한다.
- Controller의 샘플 값은 API 계약 검증을 위한 임시 구현이며 실제 데이터로 간주하지 않는다.
- 공통 예외 처리는 `GlobalExceptionHandler`가 RFC 9457 `ProblemDetail` 형태로 반환한다.

## Future data implementation boundary

Service, Domain, Repository와 JSON 데이터 로딩은 현재 아키텍처가 아니라 이후 구현할
범위다. 구현을 시작할 때 유스케이스와 데이터 형태를 근거로 구체적인 타입과 의존 방향을
확정한다.

이후 구현에서도 다음 경계는 유지한다.

- Controller가 JSON이나 영속 저장소를 직접 읽지 않는다.
- 저장 방식은 Repository 밖으로 노출하지 않는다.
- Controller는 HTTP 요청과 응답 변환에 집중한다.
- Service와 Domain의 책임은 실제 유스케이스를 기준으로 나누며 빈 계층을 먼저 만들지
  않는다.

## External interfaces

현재 Controller와 생성된 OpenAPI 문서가 제공하는 조회 API는 다음과 같다.

| Module | Method | Endpoint | Description |
| --- | --- | --- | --- |
| product | GET | `/api/products` | 제품 목록 조회 |
| product | GET | `/api/products/count` | 제품 필터 결과 개수 조회 |
| product | GET | `/api/products/{productId}` | 제품 간단 조회 |
| product | GET | `/api/products/detail/{productId}` | 제품 상세 조회 |
| category | GET | `/api/categories` | 카테고리 조회 |
| brand | GET | `/api/brands` | 브랜드 조회 |
| brand | GET | `/api/brands/{brandId}` | 브랜드 상세 조회 |
| ingredient | GET | `/api/ingredients` | 성분 조회 |
| ingredient | GET | `/api/ingredients/{ingredientId}` | 성분 상세 조회 |

제품 간단 조회와 상세 조회는 서로 다른 응답 계약을 사용한다.

- `/api/products/{productId}`는 제품 목록 항목과 같은 `ProductResponse`를 반환한다.
- `/api/products/detail/{productId}`는 카테고리, 효능과 전체 성분을 포함하는
  `ProductDetailResponse`를 반환한다.

## API contract generation

Controller, DTO와 OpenAPI 설정 코드가 API 계약의 권위 원천이다.
`./gradlew generateApiArtifacts`는 다음 생성물을 갱신한다.

| Output | Role |
| --- | --- |
| `server/openapi.json` | OpenAPI 문서 |
| `common/api.zod.ts` | 프론트엔드용 Zod 스키마와 타입 |
| `common/api.zod.types.d.ts` | 생성 타입 선언 |

생성물은 직접 수정하지 않는다. Controller나 DTO의 계약이 바뀌면 공식 생성 작업을 실행해
함께 커밋한다.

## Architecture invariants

1. 현재 외부 API의 기본 경로는 `/api`다.
2. 제품 간단 조회와 제품 상세 조회는 별도 엔드포인트와 응답 DTO를 사용한다.
3. 기능 전용 요청·응답 DTO는 해당 기능의 `controller.dto` 패키지에 둔다.
4. 다른 기능의 응답에 중첩되는 DTO는 정의 기능의 `controller.dto`가 소유한다.
5. 특정 기능에 속하지 않는 횡단 API 계약만 `common.dto`에 둔다.
6. 구현되지 않은 Service, Repository와 데이터 계층을 현재 구조로 가정하지 않는다.
7. 사용하지 않는 타입을 아키텍처 모양만 맞추기 위해 만들지 않는다.
8. API 계약 변경 시 OpenAPI와 TypeScript 생성물을 함께 갱신한다.

## Open decisions

- Service, Domain, Repository의 구체적인 타입과 의존 방향은 실제 데이터 구현 작업에서
  확정한다.
- JSON 데이터의 스키마와 로딩 책임은 데이터 파일이 추가될 때 확정한다.
