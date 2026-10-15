# 큐레이션 본문 JSONB 전환 설계 (#695)

## 상태와 범위

- 2026-10-14 후속 구현: V13 제거 마이그레이션을 추가하고 수동 SQL 초안을 제거했다.
  이관 테스트를 실제 V13 적용과 수정된 JSONB 보존 검증으로 바꾸고 현재 스키마 테스트·운영
  문서를 정리했다. 실제 staging·운영 제거 배포와 외부 ERD 반영은 아직 수행하지 않았다.
- 후속 구현 검증: PostgreSQL 16 임시 컨테이너에서 변경한 이관·스키마 테스트 7개와
  `sh scripts/verify.sh`를 통과했다. 전체 테스트 1,121개, 실패·오류·스킵 없음.
  포맷·Checkstyle·구조 검사·빌드 성공, OpenAPI·common 생성물 드리프트 없음.
  테스트 컨테이너는 검증 후 제거했다.
- 2026-10-14 설계 단계: 사용자가 첫 운영 배포 확인 완료를 알렸다. 최신 `origin/dev`의 `80354d8e`에서
  `refactor/695-remove-curation-legacy` 브랜치를 만들고 아래 7절에 후속 제거 작업을 설계했다.
  이 단계에서는 설계까지만 수행하고 제거 구현·배포와 외부 ERD 편집은 후속으로 남겼다.
- 설계 단계의 `git diff --check`는 통과했다. `sh scripts/verify.sh`는 실행했지만
  로컬 테스트 DB(`localhost:5432`) 연결 거부로 OpenAPI 생성용 서버 기동에 실패했다.
  제거 구현 시 테스트 DB를 준비한 뒤 필수 검증을 다시 수행한다.
- 2026-10-13: 첫 배포용 코드·V12 이전·JSONB 읽기를 구현했다. 운영 데이터는 변경하지 않았다.
- 사용자 요청에 따라 별도 적재 검증 CLI와 관련 코드·테스트를 제거했다.
- 사용자 요청에 따라 중복된 테스트와 이관 테스트 준비 코드를 간소화했다.
- 최종 `sh scripts/verify.sh` 통과: 전체 테스트 1,098개, 스타일·구조 검사·빌드 성공.
  공개 API 생성물 내용 변경 없음.
- 테스트 간소화 전 추가 검토: 이전 SQL·codec·조회 트랜잭션·사이트맵·제거 SQL을
  독립 검토와 대조했다. 수정이 필요한 결함은 발견하지 않았다. 코드 변경 없이 읽기 전용으로
  검토했다.
- 두 번째 배포용 제거 SQL도 테스트했으며 실제 배포와 외부 ERD 편집은 남아 있다.
- 이슈: [#695](https://github.com/woowacourse-teams/2026-poudy/issues/695).
- 기존 IMAGE / PRODUCTS / PRODUCTS_BY_FILTER의 저장 구조만 바꾸고 공개 API·화면 동작은 유지한다.
- PRODUCT_LINK와 브랜드·성분 검색 조건은 후속 [#675](https://github.com/woowacourse-teams/2026-poudy/issues/675)에서 추가한다.
- 버저닝, 새 MongoDB·Redis, 관리자 CRUD·편집 UI, 예약 게시, 참조 복제 테이블, 별도 검증 CLI는 범위 밖이다.

참고 사례는 [올리브영 전시영역 MongoDB 도입하기](https://oliveyoung.tech/2023-01-04/oliveyoung-discovery-mongodb/)다.
전시 타입마다 다른 내용을 문서로 관리한다는 원칙을 가져오고, 저장소는 기존 PostgreSQL을 유지한다.
올리브영의 버전 관리·캐싱 구조까지 도입하지 않는다.

## 1. 저장 모델

최종 상태는 기존 `curation`에 `blocks JSONB NOT NULL`을 추가하는 구조다.

```text
curation
  id / position
  title / description
  publication_status / banner_visible / banner_thumbnail_image_url
  blocks JSONB
  created_at / updated_at
```

- 기존 메타데이터, 시각과 배너 CHECK는 유지한다.
- `CHECK (jsonb_typeof(blocks) = 'array')`로 루트 배열을 보장한다. 빈 본문 `[]`은 허용한다.
- 최종 컬럼에는 빈 배열 DEFAULT를 두지 않는다. 신규 적재자는 본문을 명시해야 한다.
  누락한 본문이 조용히 빈 큐레이션으로 바뀌는 것을 방지한다.
- 블록·필터·제품 배열 순서가 표시 순서다. JSON 객체 키 순서는 의미가 없다.
- 본문을 수정할 때 배열 전체를 교체한다. 메타데이터와 함께 수정하면 같은 트랜잭션으로 갱신한다.
- 문서 내부의 제품 ID에는 FK가 없다. 이번 범위에는 적재 전 제품 참조 검증 경로를 추가하지 않는다.
- JSON 내부 검색을 하지 않으므로 이번 작업에 GIN 인덱스를 추가하지 않는다.

최종 제거 대상은 `curation_block`, `curation_block_filter`, `curation_block_product`,
`curation_block_product_filter` 네 테이블이다. 삭제는 읽기 전환 배포가 안정화된 다음 배포에서 한다.

## 2. 저장 문서 계약

| 블록 | 공통 필드 외 저장 값 |
| --- | --- |
| IMAGE | imageUrl, altText, bodyText |
| PRODUCTS | productIds |
| PRODUCTS_BY_FILTER | filters와 제품별 productId / filterIds |

공통 필드는 id(UUID), type, spacingTop, spacingBottom이다. 필드 이름은 기존 응답과 맞추지만,
상품은 현재 카탈로그에서 읽으므로 저장 문서에는 상품 응답 전체를 넣지 않는다.

예시는 형식 설명용이다.

```json
[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "type": "IMAGE",
    "spacingTop": 8,
    "spacingBottom": 24,
    "imageUrl": "https://cdn.example.com/curations/detail.png",
    "altText": null,
    "bodyText": null
  },
  {
    "id": "00000000-0000-4000-8000-000000000002",
    "type": "PRODUCTS",
    "spacingTop": 0,
    "spacingBottom": 24,
    "productIds": [10, 20]
  },
  {
    "id": "00000000-0000-4000-8000-000000000003",
    "type": "PRODUCTS_BY_FILTER",
    "spacingTop": 0,
    "spacingBottom": 24,
    "filters": [
      { "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "label": "입문용" }
    ],
    "products": [
      { "productId": 10, "filterIds": ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"] }
    ]
  }
]
```

- 필수 공통 필드·타입별 필드·배열이 누락되면 거절한다. 빈 배열과 누락은 구분한다.
- IMAGE의 altText/bodyText 키는 유지하며 NULL과 빈 문자열을 구분한다.
- 배열에 position, 제품명·가격·이미지, DB 감사 시각은 저장하지 않는다.
- 저장 JSON을 공개 DTO로 직접 역직렬화하지 않는다.
- 알 수 없는 타입·필드와 잘못된 JSON 자료형은 거절한다. 숫자 문자열이나 소수 ID를
  자동 변환하지 않고, 필수 정수 필드의 누락을 0으로 대체하지 않는다.
- 형식 버전 필드와 문서 버전 테이블은 도입하지 않는다. 이후 형식 변경은 명시적인 데이터
  이전과 코드 배포로 처리한다.

## 3. 구현 책임

### Repository와 JSON 해석

`curation.repository`의 `CurationDocumentCodec`이 저장 문서를 해석한다.
세 블록 타입의 판별자와 필수 값을 해석하고 기존 CurationBlock factory로 도메인을 조립한다.
직렬화 라이브러리는 현재 서버의 Jackson 계열에 맞추며 엄격한 해석 설정은 이 codec에 한정한다.
전역 ObjectMapper 동작이나 공개 API JSON 규칙을 바꾸지 않는다.

`CurationRepository`는 기존 네 하위 테이블의 조립 조회 대신 curation의 메타데이터와 blocks를
한 번에 읽는다. 공개된 findAll / findPublishedById 계약과 반환 도메인을 우선 유지한다.
목록에서는 상품을 조회하지 않는다. 목록 전용 새 도메인·API 모델을 추가하는 최적화는 이번
리팩터링에 포함하지 않는다.

`SitemapRepository`도 구형 테이블 조인 대신 JSONB에서 두 제품 블록 타입의 ID를 추출한다.
큐레이션과 참조 제품 중 가장 늦은 수정일을 반환하는 기존 계약을 유지한다.

### Domain과 상품 해석

기존 Curation, CurationBlocks, 세 CurationBlock 타입과 공개 투영을 재사용한다.
도메인은 JSON·Jackson·HTTP 응답 타입을 알지 않는다.
구조 검증은 기존 생성자 규칙을 재사용하고, 없어진 저장 제약 중 필요한 규칙만 보강한다.

`CurationService.findDetail`은 기존처럼 참조 상품 ID를 모아 ProductRepository에서 해석한다.
문서 조회와 상품 해석이 같은 읽기 전용 REPEATABLE READ 트랜잭션에 속하도록 서비스 경계를 둔다.
현재 두 Repository의 별도 트랜잭션만으로 두 조회의 동일 스냅샷이 보장된다고 가정하지 않는다.

Controller, 공개 DTO, OpenAPI 계약과 클라이언트는 변경하지 않는다.
필수 생성물 검사는 수행하되 정상적으로는 common 생성 타입에 diff가 없어야 한다.

## 4. 검증과 오류 정책

### 구조 검증

- 블록 UUID의 큐레이션 내 중복, 필터 UUID·제품 ID의 블록 내 중복을 거절한다.
- 여백은 0 이상, 이미지 URL은 비어 있지 않아야 한다. 기존 DB의 URL 길이 제한도 보존한다.
- altText는 기존 500 유니코드 코드 포인트 제한과 NULL/장식용 빈 문자열 의미를 유지한다.
- 필터 문구는 공백이 아니며 기존 VARCHAR(100) 범위로 검증한다.
- PRODUCTS의 제품 ID는 양수이며 비어 있는 제품 배열은 기존 도메인처럼 허용한다.
- PRODUCTS_BY_FILTER에는 필터가 최소 하나 있어야 한다. 각 제품은 이 블록에 존재하는
  필터 ID를 하나 이상 가져야 하며, 중복 매핑을 허용하지 않는다.
- 필터 제품 배열이 비어 있을 때의 기존 공개 투영을 유지한다. 새 문서 크기 제한이나
  임의의 제품 개수 상한은 이번 저장 변경에 끼워 넣지 않는다.

### 향후 쓰기 경계의 검증

현재 서버에는 큐레이션 쓰기 API와 저장 서비스가 없으므로 별도 적재 검증 CLI를 만들지 않는다.
조회 시 codec과 도메인으로 구조를 검증하고 제품 참조는 현재 카탈로그에서 해석한다.
향후 쓰기 기능을 추가할 때 해당 서비스에서 구조와 제품 ID의 존재를 저장 전에 검증한다.
직접 SQL 적재의 제품 참조를 서버가 저장 전에 검증한다고 보장하지 않는다.

참조 존재는 판매 중 여부와 구분한다. 현재 ProductLoader는 ID 조회에서 상품을 읽으므로
이를 판매 중 상품만 남기는 목록 검색으로 교체하지 않는다.

### 조회 시 처리

| 상태 | 처리 |
| --- | --- |
| 구조가 올바르지 않은 JSONB | curation ID를 포함한 인프라 오류로 처리. 빈 본문이나 legacy 데이터로 대체하지 않음 |
| JSON 구조는 유효하지만 현재 상품이 없음 | 기존 도메인 투영 유지: 없는 상품·빈 필터 제외, 최종 상품이 없으면 해당 블록 제외 |
| DB 장애·타임아웃·상품 조립 실패 | 요청 실패로 처리. 상품 미존재로 바꾸지 않음 |

상품 참조 부재는 운영자가 수정할 수 있도록 ID 중심으로 기록한다. 본문 전체·환경변수·접속정보를
로그로 남기지 않는다. 공개 조회가 저장 문서를 자동 수정하지 않는다.

## 5. 데이터 이전과 두 번의 배포

### 첫 배포: 추가·변환·읽기 전환

1. V12로 nullable blocks를 추가한다. 이미 존재하는 V1~V11은 변경하지 않는다.
2. 기존 데이터를 jsonb_build_object / jsonb_agg로 변환한다. 모든 배열 집계에 ORDER BY를
   명시하고, 자식이 없으면 COALESCE로 `[]`를 넣는다.
3. 필터·제품·제품별 filterIds는 각각 따로 집계하여 조인 곱에 의한 중복과 순서 손실을 막는다.
   타입별 필드만 생성하며 JSON의 NULL 키를 제거하지 않는다.
4. 블록이 없는 큐레이션도 `[]`를 채운다. 도메인 UUID와 입력 배열 순서, 이미지 텍스트의
   NULL/빈 문자열/공백/줄바꿈, 제목·게시·배너 정책을 보존한다.
5. 이전 결과와 legacy 조립 결과를 비교한 뒤 NOT NULL과 루트 배열 CHECK를 적용한다.
6. 서버의 Repository 읽기를 JSONB로 전환한다. 구형 테이블은 아직 남겨 구버전 서버가
   롤링 배포 중 조회할 수 있게 한다.

최초 이전에 입력 적재를 통제하고, 구버전 서버가 남아 있는 동안 큐레이션 수정·게시를 중지한다.
이는 구현 배포 시 필요한 운영 절차이며 지금 실제 운영 쓰기를 중지한 것은 아니다.
무기한 이중 쓰기·런타임 fallback·동기화 트리거를 추가하지 않는다.

첫 배포에서 JSONB가 변경되지 않았다면 구버전 서버로 되돌려 기존 테이블을 읽을 수 있다.
전환 뒤 본문 수정이 시작되면 legacy 데이터는 낡으므로 구버전 앱 롤백을 안전하다고 약속하지 않는다.

### 두 번째 배포: 구형 구조 제거

- 모든 서버가 JSONB를 읽고 이전 전후 결과가 일치하는지 확인한 다음 제거 마이그레이션을 배포한다.
- 제거 SQL을 첫 배포와 같은 Flyway 실행에 넣지 않는다. 같은 PR의 연속 버전 파일이어도
  서버 기동 때 모두 실행되므로 구버전 서버의 읽기를 깨뜨릴 수 있다.
- 네 테이블은 자식부터 명시적으로 제거한다. 광범위한 DROP CASCADE는 사용하지 않는다.
- 큐레이션 전용 require_curation_block_child_type / require_curation_block_filters 함수와
  전용 트리거를 정리한다. 다른 도메인도 사용하는 require_contiguous_order 함수는 유지한다.
- ERD에는 첫 단계의 blocks 추가와 최종 네 테이블 제거를 구분해 반영한다.
  JSON 내부 제품·필터 연결은 DB FK 관계선으로 그리지 않는다.

#695의 완료는 최종 제거까지다. 실제 두 번째 배포와 외부 ERD 편집은 각각 실행 권한과 환경이
있는 단계에서 수행하며, 설계 문서 작성으로 완료 처리하지 않는다.

## 6. 테스트와 완료 기준

- [x] codec: 유효한 문서·빈 본문과 대표적인 잘못된 문서·자료형·필터 참조 거절
- [x] 기존 API·도메인 테스트에서 이미지 텍스트와 게시·배너·상품 표시 계약 유지 확인
- [x] 마이그레이션: 실제 V11→V12 적용 후 세 타입의 내용·배열 순서·NULL 키·빈 본문 확인
- [x] Repository / Service / Controller: 기존 API 회귀, 누락 상품 투영과 DB 오류 구분
- [x] 표준 afterMigrate 테스트 fixture는 새 JSONB 구조로 변경. 마이그레이션 테스트의 legacy
      데이터는 별도 fixture로 보관하여 실제 이전을 검증
- [x] 새 NOT NULL·루트 배열 CHECK 및 별도 테스트 스키마에서 제거 SQL 실행 확인
- [x] 로컬 ERD / ARCHITECTURE.md와 [운영 절차](../../product/curation-storage.md) 갱신
- [x] server/scripts/verify.sh 통과, API 생성물 드리프트 없음
- [ ] 운영 첫 배포·데이터 확인 후 두 번째 배포로 legacy 테이블·전용 함수 제거
- [ ] 실제 배포 단계에 맞춰 외부 ERD 갱신

저장 테이블 제약을 검증하던 CurationSchemaTest는 새 DB 제약과 서버 구조 검증 테스트로 역할을
나눈다. 없어지는 테이블의 테스트를 이름만 유지하거나 실패를 우회하지 않는다.
세부 검증 조합을 모두 나열하거나 기존 도메인 검증을 반복하지 않는다. 이관 결과는 JSONB 문서
동등성으로 비교하고, 공개 응답은 기존 API 테스트가 확인한다. 누락 상품 처리도 실제 API로 검증한다.

## 구현 순서

1. 저장 타입·codec과 도메인 규칙 차이 검증.
2. 추가·변환 마이그레이션과 legacy → JSONB 문서 동등성 테스트.
3. Repository 읽기·상세 트랜잭션과 fixture 전환.
4. API 회귀·필수 검사 후 첫 배포.
5. 운영 확인 후 제거 마이그레이션과 ERD 최종 반영.
6. 완료 후 #675에서 PRODUCT_LINK를 추가.

첫 배포에서는 제거 SQL을 자동 Flyway 경로 밖의 초안으로 보관했다. 후속 구현에서는
`V13__remove_curation_legacy_tables.sql`로 옮기고 중복 수동 SQL을 제거했다.

## 7. 운영 확인 후 레거시 제거 설계 (2026-10-14)

### 현재 코드와 작업 범위

설계 기준 원격 dev에는 V12와 JSONB 조회, #675의 PRODUCT_LINK 지원이 들어 있다. Java 운영 코드에는
구형 테이블 조회가 남아 있지 않다. 제거 SQL 초안은 자동 마이그레이션 경로 밖에 있고,
이관 테스트가 파일을 직접 실행한다. 최신 마이그레이션은 V12이므로 다음 버전은 V13이다.
구현 직전에 dev에 다른 마이그레이션이 추가됐는지 다시 확인하고 충돌하면 다음 가용 번호를 쓴다.

이번 PR은 네 구형 테이블과 전용 함수 제거, 현재 스키마에 맞춘 테스트, 배포 문서 정리를 포함한다.
본문·메타데이터·공개 응답과 PRODUCT_LINK 동작은 그대로 보존한다. 외부 ERD는 제거 배포가
확인된 뒤 반영하며, #695는 그 단계까지 완료된 뒤 닫는다.

### 제거 마이그레이션

1. `scripts/curation/remove-legacy-tables.sql`을
   `src/main/resources/db/migration/V13__remove_curation_legacy_tables.sql`로 옮긴다.
   같은 SQL을 두 경로에 복제하지 않고 수동 실행 초안은 제거한다.
2. 기존 초안의 테이블 잠금과 JSONB 루트 배열·NULL 검사를 유지한다. Flyway의 PostgreSQL
   마이그레이션 트랜잭션 안에서 검사와 DDL을 함께 실행한다. 명시적 BEGIN/COMMIT을 넣지 않는다.
   JSONB는 이미 갱신됐을 수 있으므로 구형 데이터로 다시 채우거나 구형 테이블과 동등성을
   다시 강제하지 않는다. 기존 `blocks`, 메타데이터와 시각을 UPDATE하지 않는다.
3. `curation_block_product_filter` → `curation_block_product` → `curation_block_filter` →
   `curation_block` 순서로 DROP한다. 테이블 소유 인덱스·제약·트리거는 함께 제거된다.
4. `require_curation_block_child_type()`과 `require_curation_block_filters()`를 DROP한다.
   `require_contiguous_order()`와 성분·제품·의견 등 다른 테이블의 트리거는 보존한다.
5. DROP CASCADE와 IF EXISTS로 예상하지 못한 의존성이나 스키마 드리프트를 숨기지 않는다.
   실패하면 트랜잭션 전체가 롤백되도록 한다. 이미 적용된 V1~V12는 수정하지 않는다.
   새 DB도 기존 마이그레이션을 순서대로 실행한 뒤 최종적으로 같은 구조가 된다.

### 테스트 정리와 검증

| 대상 | 변경과 검증할 계약 |
| --- | --- |
| `CurationJsonbMigrationTest` | V11 fixture → V12 이전 검증을 유지하고, 수동 SQL 실행을 실제 Flyway V13 적용으로 교체한다. Flyway 실행 전에 전용 연결의 진행 중 트랜잭션을 커밋해 잠금 대기를 피한다. |
| 같은 이관 테스트의 제거 검증 | V13 전후 `blocks`와 메타데이터·시각이 동일하고 네 테이블·전용 함수 두 개가 모두 없는지 확인한다. 공용 순서 함수와 큐레이션 상세·사이트맵 조회가 유지되는지도 검증한다. |
| V12 이후 수정된 본문 | 임시 스키마의 V12 이후 본문에 유효한 PRODUCT_LINK를 추가한 뒤 V13을 적용한다. 구형 테이블에 없는 새 블록도 보존되고 codec으로 읽히는지 확인한다. V12 동등성 검증은 수정 전에 수행한다. |
| `ErdCloudSchemaTest` | 현재 스키마의 테이블·컬럼·PK 기대값에서 네 테이블 항목을 제거한다. 전체 테이블 목록 일치 검증은 유지한다. |
| `ContiguousOrderSchemaTest` | 레거시 테이블을 만드는 `checksCompositeParentKey`, 전용 UUID 상수·import를 제거한다. 현재 복합 부모 키를 쓰는 공용 순서 트리거는 없어 해당 사례를 위해 새 테스트 테이블을 만들지 않는다. 성분 태그의 정상·순서 누락·0 시작 제약 검증은 유지한다. |
| 표준 fixture와 API 회귀 | `afterMigrate__test_data.sql`은 이미 JSONB를 사용하므로 불필요하게 바꾸지 않는다. 큐레이션 목록·상세·PRODUCT_LINK 및 사이트맵 기존 테스트를 최종 스키마에서 실행한다. |

`src/test/resources/db/curation-legacy-data.sql`은 V11→V12 회귀 검증에 필요하므로 보존한다.
과거 마이그레이션·완료 문서·이전 테스트 fixture에 남는 구형 이름은 제거 대상이 아니다.
검증은 변경한 마이그레이션·스키마 테스트를 먼저 실행하고 `sh scripts/verify.sh`로 마무리한다.
OpenAPI·common 생성물에는 이번 정리로 인한 계약 변경이 없어야 한다.

### 문서와 배포

- `docs/product/curation-storage.md`의 제거 SQL 초안·복사·수동 실행 안내를 실제 V13 경로와
  Flyway 배포 절차로 교체한다. 현재 코드·운영 스키마·완료된 배포 상태를 구분해서 기록한다.
- 이 계획의 제거 체크박스는 구현만으로 체크하지 않는다. 실제 제거 배포와 외부 ERD 반영 후
  완료 상태를 기록하고 계획을 `completed/`로 옮길 때 #675 문서의 참조 링크도 함께 갱신한다.
- 별도 PR은 #695에 연결한다. staging에서 V12→V13 적용·최종 조회를 확인한 뒤 운영으로 배포한다.
  사용자의 운영 확인 보고는 기록하되, 이번 설계 과정에서 운영 DB에 직접 접속한 것으로 쓰지 않는다.
- 배포 전에 모든 인스턴스가 JSONB 조회 버전인지 확인하고 직접 SQL 적재·수정 작업을 조율한다.
  기존 초안의 ACCESS EXCLUSIVE 잠금은 큐레이션 조회·수정을 일시적으로 기다리게 하므로
  장기 트랜잭션이 없는 시점에 배포한다. 운영 적용 전 복구 가능한 DB 백업을 확인한다.
- 배포 후 Flyway V13 성공, 네 테이블·전용 함수 부재, 큐레이션 목록·운영 상세·사이트맵의
  기존 응답과 서버 오류 로그를 확인한다. 외부 ERD에서 네 테이블과 관계선을 제거하고
  `curation.blocks` 및 다른 도메인의 관계는 유지한다.
- 제거 후 앱 롤백은 현재 JSONB 문서 타입을 지원하는 버전으로 한정한다. 구형 테이블 조회 버전으로
  되돌리지 않는다. DB를 되돌려야 하면 백업 복원과 배포 후 변경분 복구를 별도로 계획한다.
  최신 JSONB를 낡은 구형 데이터로 덮어쓰는 복구 SQL을 추가하지 않는다.

### 후속 구현 완료 기준

- [x] 자동 Flyway 제거 마이그레이션 추가 및 중복 수동 SQL 제거
- [x] 실제 V11→V12→V13 이관·제거와 V12 이후 수정 본문 보존 검증
- [x] 현재 스키마 테스트의 레거시 의존 정리 및 공용 순서 제약 유지
- [x] 운영 절차 문서 갱신 및 `sh scripts/verify.sh` 통과
- [ ] staging·운영 제거 배포와 공개 조회 확인
- [ ] 외부 ERD 반영 후 #695 및 실행 계획 완료 처리
