# 큐레이션 조회 API 구현 계획

## 상태

- 상태: **구현 완료, 운영 데이터 제공 대기**
- 시작일: 2026-09-08
- 구현 완료일: 2026-09-08
- 추적 이슈: [#426 큐레이션 조회 API 구현](https://github.com/woowacourse-teams/2026-poudy/issues/426)
- 소유 도메인: `curation`

## 목표

편집 순서와 게시 상태를 가진 큐레이션 데이터를 기존 JSON 카탈로그 경계에 추가하고 다음 조회를
제공한다.

- `GET /api/curations`: `PUBLISHED` 상태의 큐레이션을 ID 오름차순으로 반환한다.
- `GET /api/curations/{curationId}`: 큐레이션 상세와 제품 필터용 카테고리를 반환한다.
- `GET /api/curations/{curationId}/products`: 선택한 카테고리에 속한 제품을 큐레이션 등록 순서로
  반환한다.

페이지네이션과 정렬 입력은 추가하지 않는다. `categoryId`가 없으면 등록 제품 전체를 반환하고,
카탈로그에 없는 카테고리 ID는 오류가 아니라 빈 목록으로 처리한다. 조회할 수 없는 큐레이션 ID는
`404 CURATION_NOT_FOUND`로 응답한다.

## 전제와 결정

1. 관리자 기능에서 작성 중, 게시 중, 게시 종료 데이터를 함께 보관할 수 있도록
   `CurationStatus`를 둔다.
   - `DRAFT`: 작성 중이며 공개 조회 대상이 아니다.
   - `PUBLISHED`: 게시 중이며 공개 조회 대상이다.
   - `ARCHIVED`: 게시가 종료됐으며 데이터는 보관하지만 공개 조회 대상이 아니다.
   일반적인 생명주기는 `DRAFT -> PUBLISHED -> ARCHIVED`다. 상태 변경 명령과 전이 검증은 관리자
   쓰기 API가 생길 때 구현하고, 이번 범위에서는 저장된 상태를 해석해 조회만 제한한다.
2. 목록의 간단 설명과 상세 설명은 내용 수명이 다르므로 데이터에서는 `summary`와 `description`으로
   분리한다. 두 API 응답에서는 계약에 맞춰 모두 `description`이라는 필드로 내보낸다.
3. 목록 대표 이미지는 별도 중복 저장하지 않고 순서가 있는 `image_urls`의 첫 번째 값을 사용한다.
   따라서 큐레이션은 이미지를 하나 이상 가져야 한다.
4. 상세의 필터 카테고리는 제품에서 자동 추론하지 않는다. 편집자가 노출할 필터와 그 순서를
   `category_ids`로 지정하고 저장소가 기존 `Category`로 해석한다.
5. 큐레이션 제품은 `product_ids`의 배열 순서가 권위 원천이다. 저장소가 기존 `Product`로 해석한
   뒤에도 그 순서를 유지한다.
6. 카테고리 필터는 기존 `Product.belongsToCategory`를 사용한다. 따라서 소분류 ID는 해당 소분류만,
   대분류 ID는 그 자식 소분류 제품까지 포함한다.
7. 요청의 `categoryId`가 상세 응답의 `categories`에 포함됐는지는 제한 조건으로 삼지 않는다.
   실제 제품 카테고리에 해당하면 필터하고, 아무 제품과도 맞지 않으면 빈 목록을 반환한다.

## 데이터 계약

운영 카탈로그와 같은 외부 데이터 디렉터리에 `curations.json`을 추가한다. 저장 형식은 Repository
밖으로 노출하지 않는다.

```json
{
  "curations": [
    {
      "id": 12,
      "title": "환절기 장벽 케어",
      "summary": "큐레이션 간단 설명글",
      "description": "환절기에 피부 장벽 관리가 필요한 이유와 제품 선택 기준",
      "image_urls": [
        "https://cdn.example.com/curations/12/main.png",
        "https://cdn.example.com/curations/12/description-1.png"
      ],
      "category_ids": [1],
      "product_ids": [15, 1, 7],
      "status": "PUBLISHED"
    }
  ]
}
```

기동 시 다음 정합성을 검사하고 어기면 `InfrastructureException`으로 기동을 실패시킨다.

- 큐레이션 ID는 전체 파일에서 유일하다.
- 제목, 간단 설명, 상세 설명은 비어 있지 않다.
- 상태는 `DRAFT`, `PUBLISHED`, `ARCHIVED` 중 하나여야 한다.
- 이미지 URL 목록은 비어 있지 않고 각 값도 비어 있지 않다.
- 카테고리 ID와 제품 ID는 각각 한 큐레이션 안에서 중복되지 않는다.
- 모든 카테고리 ID와 제품 ID는 기존 카탈로그에서 해석돼야 한다.
- 제품 목록은 비어 있을 수 있다. 빈 큐레이션도 정상적인 빈 `items` 응답을 만든다.

운영 `curations.json`은 저장소에 커밋하지 않는다. 테스트와 OpenAPI 생성에는
`src/test/resources/curations.json` fixture를 사용하며, 배포 전 운영 데이터 디렉터리에 같은 계약의
파일을 제공해야 한다.

## 향후 DB 매핑

DB 전환 시에도 도메인의 `CurationStatus`를 유지하고 저장소 구현만 교체한다. 상태는
`curation.status` 문자열 컬럼과 `DRAFT`, `PUBLISHED`, `ARCHIVED` check constraint로 저장한다.
목록의 `status = 'PUBLISHED' ORDER BY id` 조회를 위해 `(status, id)` 복합 인덱스를 둔다.

순서가 계약인 다중 값은 단순 다대다 관계로만 저장하지 않고 순서 컬럼을 함께 둔다.

```text
curation
  id, title, summary, description, status

curation_image
  curation_id, image_url, display_order

curation_category
  curation_id, category_id, display_order

curation_product
  curation_id, product_id, display_order
```

각 관계 테이블은 `(curation_id, display_order)`와 `(curation_id, 참조_id)`를 유일하게 만들어 순서
충돌과 중복 등록을 막는다. 제품 조회는 항상 `curation_product.display_order`로 정렬한다.
예약 게시나 상태 변경 이력이 실제로 필요해지면 `published_at`, `archived_at` 또는 이력 테이블을
별도 요구로 추가하고 현재 상태와 혼용하지 않는다.

## 도메인과 데이터 흐름

```text
curations.json
  -> CurationRepository
      -> category_ids를 Categories로 해석
      -> product_ids를 Products로 해석하며 배열 순서 보존
  -> Curations
      -> ID 중복 검증
      -> 게시 상태와 ID 정렬
  -> CurationService
      -> 목록 / 상세 / 카테고리별 제품 유스케이스
  -> CurationController
      -> API별 응답 DTO 변환
```

### `Curation`

큐레이션 하나의 내용, 편집 순서와 게시 상태를 소유한다.

- 필드: `id`, `title`, `summary`, `description`, `imageUrls`, `categories`, `products`, `status`
- `representativeImageUrl()`: `imageUrls`의 첫 값을 반환한다.
- `products(Long categoryId)`: `null`이면 전체를, 값이 있으면 `Product.belongsToCategory`가 참인
  제품만 반환한다. 스트림 필터만 사용해 원래 순서를 보존한다.
- 컬렉션 필드는 방어 복사해 외부 변경을 막는다.

### `Curations`

전체 큐레이션 인덱스와 컬렉션 규칙을 소유한다.

- `from(List<Curation>)`: ID 기준 불변 Map을 만들고 중복 ID를 거부한다.
- `publishedSortedById()`: `PUBLISHED`인 값만 ID 오름차순으로 반환한다.
- `findPublishedById(Long)`: 없거나 `PUBLISHED`가 아니면 빈 `Optional`을 반환한다.

### `CurationRepository`

`JsonDataReader`, `Categories`, `ProductRepository`를 주입받는다. 전용 Jackson deserializer에서 참조
ID를 도메인 객체로 해석하고 `Curations`를 한 번 생성해 보관한다.

- `findAll()`: 조립된 `Curations`를 반환한다.
- 존재하지 않는 참조, 잘못된 JSON 타입과 도메인 불변식 위반은 데이터 파일 문제로 분류해
  `InfrastructureException` 경계를 유지한다.
- Controller 응답 DTO나 HTTP 상태를 알지 않는다.

### `CurationService`

- `findCurations()`: `Curations.publishedSortedById()`를 반환한다.
- `findDetail(curationId)`: `findPublishedById` 결과가 없으면
  `ResourceNotFoundException(CURATION_NOT_FOUND)`을 던진다.
- `findProducts(curationId, categoryId)`: 먼저 같은 방식으로 큐레이션을 찾고, 찾은 뒤
  `Curation.products(categoryId)`를 반환한다. 카테고리 저장소에서 존재 여부를 선검증하지 않는다.

## HTTP와 응답 DTO

`CurationController`는 `/api/curations`를 기준 경로로 갖는다.

```text
GET /api/curations
  -> CurationListResponse(items: List<CurationSummaryResponse>)

GET /api/curations/{curationId}
  -> CurationDetailResponse

GET /api/curations/{curationId}/products?categoryId={id}
  -> CurationProductListResponse(items: List<CurationProductResponse>)
```

DTO 변환 책임은 다음과 같다.

- `CurationSummaryResponse`: `id`, `title`, `summary`를 응답의 `description`으로 변환하고
  `representativeImageUrl`을 `imageUrl`로 변환한다.
- `CurationDetailResponse`: `id`, `title`, 상세 `description`, 순서가 보존된 `imageUrls`,
  `CurationCategoryResponse` 목록을 반환한다.
- `CurationProductResponse`: 기존 `Product`와 대표 `ProductVariant`에서 `id`, `name`, 한글
  `brandName`, `imageUrl`, `price`, `volumeValue`, `volumeUnit`, `moistureLevel`, `oilLevel`을 만든다.

응답 필드는 `@NotNull`과 `@Schema`로 필수 여부, 설명과 예시를 명시한다. `categoryId`는 제약 없는
선택적 `Long`으로 받아 음수나 미등록 ID도 빈 목록 규칙에 포함한다. 숫자로 변환할 수 없는 값은
기존 전역 처리에 따라 `400 INVALID_QUERY_PARAMETER`가 된다.

## 오류와 OpenAPI

- `ErrorCode`에 `CURATION_NOT_FOUND("큐레이션을 찾을 수 없습니다.")`를 추가한다.
- `ErrorResponseCodes.NOT_FOUND_CODES`에 `curations -> CURATION_NOT_FOUND`를 추가한다. 그러면 두
  path-variable 엔드포인트의 OpenAPI에 동일한 404 응답이 자동으로 붙는다.
- 목록 엔드포인트에는 404를 선언하지 않는다.
- 모든 엔드포인트의 500 응답은 기존 `ErrorResponseConfig`가 추가한다.
- 구현 후 `generateApiArtifacts`가 만드는 `server/openapi.json`, `common/api.zod.ts`,
  `common/api.zod.types.d.ts`를 함께 갱신한다.

## 예상 파일

```text
server/src/main/java/com/poudy/curation/
  controller/CurationController.java
  controller/dto/CurationCategoryResponse.java
  controller/dto/CurationDetailResponse.java
  controller/dto/CurationListResponse.java
  controller/dto/CurationProductListResponse.java
  controller/dto/CurationProductResponse.java
  controller/dto/CurationSummaryResponse.java
  domain/Curation.java
  domain/CurationStatus.java
  domain/Curations.java
  repository/CurationRepository.java
  service/CurationService.java

server/src/test/java/com/poudy/curation/
  controller/CurationControllerTest.java
  controller/CurationQueryTest.java
  domain/CurationTest.java
  domain/CurationsTest.java
  repository/CurationRepositoryTest.java
  service/CurationServiceTest.java

server/src/test/resources/curations.json
```

기존 파일에서는 `ErrorCode`, `ErrorResponseCodes`와 API 생성물만 수정한다. 단순 조회용 객체 조립을
위해 별도 `CurationConfig`나 저장소 인터페이스를 미리 만들지 않는다.

## 테스트 전략

### 도메인

- 큐레이션 제품 전체 조회가 등록 순서를 유지한다.
- 대분류와 소분류 필터가 기존 제품 카테고리 의미에 맞게 동작한다.
- 존재하지 않는 카테고리 ID와 제품이 없는 큐레이션은 빈 목록을 반환한다.
- `Curations`가 중복 ID를 거부하고 `PUBLISHED` 큐레이션만 ID순으로 반환한다.
- 이미지, 필수 문자열과 중복 참조 불변식을 검증한다.

### 저장소

- JSON의 카테고리·제품 ID를 실제 도메인 객체로 해석한다.
- `product_ids`, `category_ids`, `image_urls` 순서를 보존한다.
- 존재하지 않거나 중복된 참조와 잘못된 필드 타입은 기동 실패로 분류한다.

### 서비스

- 목록, 상세, 전체 제품, 카테고리 필터 유스케이스를 각각 검증한다.
- 없는 ID와 `DRAFT`, `ARCHIVED` ID가 모두 `CURATION_NOT_FOUND`가 되는지 검증한다.
- 존재하지 않는 카테고리 ID를 저장소 오류나 404로 바꾸지 않는지 검증한다.

### HTTP 통합

- 목록 응답이 ID 오름차순이며 목록용 설명과 첫 이미지 URL을 반환한다.
- 상세 응답이 상세 설명과 이미지·카테고리 순서를 유지한다.
- 제품 응답이 큐레이션 순서와 평탄화한 브랜드명·대표 옵션·유수분 값을 반환한다.
- `categoryId` 필터 후에도 순서가 유지되고 미등록 ID는 `200 {"items":[]}`가 된다.
- 없는 큐레이션과 `DRAFT`, `ARCHIVED` 큐레이션은 두 ID 기반 엔드포인트 모두 404가 된다.

## 구현 순서

- [x] 테스트용 `curations.json`과 도메인 모델을 추가한다.
- [x] 저장소에서 기존 카테고리·제품 참조를 해석하고 데이터 정합성 테스트를 추가한다.
- [x] 서비스 유스케이스와 `CURATION_NOT_FOUND` 처리를 추가한다.
- [x] Controller와 응답 DTO, HTTP 통합 테스트를 추가한다.
- [x] OpenAPI 및 TypeScript 생성물을 갱신한다.
- [x] `sh ./scripts/verify.sh`를 두 번 실행해 생성물 드리프트가 사라지고 전체 검증이 통과하는지
  확인한다.

## 완료 조건

- [x] 세 엔드포인트가 요청·응답·오류 계약을 만족한다.
- [x] 목록 ID 순서, 큐레이션 제품 순서와 필터 후 순서를 테스트가 고정한다.
- [x] 데이터의 잘못된 참조가 런타임 500으로 늦게 드러나지 않고 기동 시 실패한다.
- [ ] 운영 데이터 제공 경로가 준비돼 테스트 fixture에만 의존하지 않는다.
- [x] OpenAPI와 TypeScript 생성물이 코드와 일치하고 `sh ./scripts/verify.sh`가 통과한다.

## 구현 결과

- `CurationStatus`의 `DRAFT`, `PUBLISHED`, `ARCHIVED`를 JSON에서 읽고 공개 조회에는
  `PUBLISHED`만 사용한다.
- 목록, 상세와 제품 조회를 분리하고 상세·제품 조회의 상태 제한을 `CURATION_NOT_FOUND`로
  통일했다.
- 카테고리와 제품 참조를 기동 시 해석하며 잘못된 참조와 상태는 인프라 오류로 실패시킨다.
- 제품 등록 순서와 필터 후 순서, 목록 ID 순서, 상세 이미지·카테고리 순서를 테스트로 고정했다.
- OpenAPI와 공통 TypeScript Zod·타입 선언에 세 엔드포인트와 응답을 반영했다.

## 검증 결과

- `./gradlew check`
- `sh ./scripts/verify.sh`: 첫 실행에서 생성물 갱신 확인
- `sh ./scripts/verify.sh`: 재실행에서 드리프트 없음과 전체 빌드 성공 확인
