# 큐레이션 저장

큐레이션 메타데이터와 본문은 PostgreSQL의 한 행에 저장한다. 본문만 JSONB 문서로 관리하며,
제품명·가격·이미지 등 상품 응답은 복제하지 않고 공개 조회 시 현재 카탈로그에서 읽는다.
기존 목록·상세 API, 게시·배너 정책은 유지한다. PRODUCT_LINK는 후속 #675에서 추가한다.
사이트맵의 큐레이션 수정일도 JSONB의 제품 참조로 집계한다. 큐레이션과 참조 제품 중
가장 늦은 수정일을 사용하며, 없는 제품이 있으면 남은 데이터로 계산한다.

## DB 구조

아래는 전환 후 사용하는 저장 모델이다. JSON 내부 연결은 DB 외래 키가 아니다.

```mermaid
erDiagram
    curation {
        bigint id PK
        int position
        varchar title
        text description
        varchar publication_status
        boolean banner_visible
        varchar banner_thumbnail_image_url
        jsonb blocks "NOT NULL, root array, no default"
        timestamp created_at
        timestamp updated_at
    }
```

- `blocks`는 JSON 배열이어야 하며, 빈 본문은 명시적인 `[]`로 저장한다. SQL NULL과 JSON null은 거절한다.
- 블록·필터·제품·제품별 필터 ID의 배열 순서가 표시 순서다. 객체 키 순서는 의미가 없다.
- 본문 수정은 배열 전체를 교체한다. 메타데이터·게시 상태와 함께 바뀌면 같은 트랜잭션에서 갱신하고
  `updated_at`도 명시적으로 갱신한다. 자동 갱신 트리거는 없다.
- 문서 내부 검색과 버전 이력은 이번 범위에 없으므로 GIN 인덱스와 버전 테이블을 두지 않는다.

## 본문 계약

모든 블록은 `id`(UUID), `type`, `spacingTop`, `spacingBottom`을 갖는다. 여백은 0 이상의
32비트 정수다. 같은 큐레이션의 블록 ID는 중복될 수 없다.

| type | 추가 필수 필드 | 규칙 |
| --- | --- | --- |
| IMAGE | imageUrl, altText, bodyText | URL은 공백이 아니며 최대 1,000자. altText는 NULL 또는 최대 500자. bodyText는 NULL 허용 |
| PRODUCTS | productIds | 양수 64비트 정수 ID 배열. 중복 금지, 빈 배열 허용 |
| PRODUCTS_BY_FILTER | filters, products | 필터 최소 1개. 블록 내 필터 ID·제품 ID 중복 금지 |

문자열 길이는 유니코드 코드 포인트로 센다. 텍스트의 공백·줄바꿈·빈 문자열을 보존하며,
IMAGE의 `altText`/`bodyText` 키는 NULL이어도 반드시 넣는다.

필터는 `{ "id": "UUID", "label": "문구" }`이며 문구는 공백이 아니고 최대 100자다.
필터형 제품은 `{ "productId": 10, "filterIds": ["UUID"] }`이다. 각 제품의 filterIds는
이 블록에 있는 필터를 하나 이상 참조해야 하며 중복될 수 없다. products는 빈 배열을 허용한다.
필드 누락·알 수 없는 필드/타입·잘못된 자료형을 거절하고 숫자 문자열이나 소수 ID를 변환하지 않는다.

## 검증 책임

현재 큐레이션 쓰기 API와 저장 서비스는 없다. 조회 시 Repository의 codec과 도메인이
문서 구조·필수 값·블록 내부 연결을 검증한다. 제품 ID의 존재는 현재 카탈로그 조회에서 해석한다.

JSON 내부 제품 ID에는 FK가 없으므로 직접 SQL로 적재한 제품 참조가 항상 유효하다고
보장하지 않는다. 향후 저장·수정 기능을 구현할 때 해당 서비스에서 구조와 제품 참조를
저장 전에 검증한다. 참조 존재와 판매 상태는 구분한다. 별도 검증 CLI는 제공하지 않는다.

## 조회 오류

잘못된 문서는 큐레이션 ID를 포함한 인프라 오류로 처리한다. 빈 본문으로 대체하지 않는다.
구조가 유효하지만 상품이 없으면 기존 동작대로 없는 상품·빈 필터를 제외하고, 최종 상품이
없어진 제품 블록을 응답에서 제외한다. 누락 ID는 `curation_missing_product` 경고로 남기며
저장 문서를 자동 수정하지 않는다. DB 장애나 상품 조립 실패는 요청 실패로 처리한다.

## 두 번의 배포

첫 배포는 `V12__curation_blocks_jsonb.sql`이 담당한다. 기존 네 하위 테이블을 잠근 상태에서
본문을 순서대로 변환하고 NOT NULL/루트 배열 CHECK를 적용한다. 구버전 서버가 롤링 배포 중
읽을 수 있도록 네 테이블과 전용 트리거·함수는 남긴다. 새 서버는 JSONB만 읽는다.

이전 시작 전부터 모든 서버의 읽기 전환이 끝날 때까지 큐레이션 적재·수정·게시를 중지한다.
DB 잠금은 변환 중 동시 쓰기만 막으므로, 배포 전체의 쓰기 중지는 운영 절차로 지켜야 한다.
전환 뒤 JSONB 수정이 시작되면 legacy 데이터가 낡아 구버전 앱 롤백을 보장할 수 없다.

모든 서버가 JSONB를 읽고 운영 데이터의 이전 결과를 확인한 다음 **별도 배포**에서 제거한다.
검증한 제거 SQL은 `scripts/curation/remove-legacy-tables.sql`에 있다. 다음으로 사용 가능한
Flyway 버전 파일로 복사해 리뷰·배포한다. 첫 배포의 자동 마이그레이션 경로에 함께 넣지 않는다.
수동 실행한다면 반드시 명시적 트랜잭션 안에서 전체 파일을 실행해야 한다.

두 번째 배포는 `curation_block_product_filter`, `curation_block_product`,
`curation_block_filter`, `curation_block` 순서로 제거하고 큐레이션 전용 함수 두 개를 제거한다.
다른 도메인도 사용하는 `require_contiguous_order`는 유지한다. 외부 ERD에서도 이 단계가
완료된 후 기존 테이블을 제거하며, JSON 내부의 제품 참조에 FK 관계선을 그리지 않는다.
