# Product catalog implementation

## Goal

제품 JSON을 연관 도메인으로 조립하고, 제품 검색·필터·정렬·페이지 조회·개수·검색 제안·상세 조회를 실제 데이터로 제공한다.

## Decisions

- `Product`는 `Brand`, `Category`, `Ingredients`, `ProductVariants`를 직접 가진다.
- 제품 하나의 조건 판정은 `Product`, 제품 집합의 검색·필터·정렬·페이지 처리는 `Products`가 담당한다.
- 빠른 제외 성분군은 `Product`에 복제하지 않고 조회 시 `ExcludeCodeIngredients`로 성분 ID에 해석한다.
- `products.json`의 참조 ID는 `ProductRepository`가 주입받은 도메인 컬렉션으로 기동 시점에 해석한다.
- 제품 성분별 공개 함량은 현재 데이터 계약이 정해지지 않았으므로 기존 문서대로 읽지 않는다.

## Work

- [x] 도메인 필터·정렬·페이지·상세 파생 정보 테스트
- [x] 제품 표시 정보와 용량 옵션 JSON 조립 테스트
- [x] Product Service와 실제 응답 DTO 변환 테스트
- [x] Product Controller 통합 테스트
- [x] 전체 검증과 생성 API 산출물 확인

## Verification

- 도메인과 Service·Controller 테스트를 실패 상태에서 먼저 추가한 뒤 구현하여 통과시켰다.
- `sh ./scripts/test.sh`
- `sh ./scripts/verify.sh`
- 생성 API 산출물에 변경이 없음을 확인했다.

## Result

- `Product`가 실제 `Brand`, `Category`, `Ingredients`, `ProductVariants`를 가진다.
- `Products`가 동일한 조건으로 검색·필터·정렬·페이지 조회와 개수 계산을 수행한다.
- Product API가 샘플 응답 대신 JSON에서 조립한 실제 제품 데이터를 반환한다.
- 상세 조회가 카테고리 경로, 전체 용량 옵션, 성분, 피부 효능 그룹과 빠른 제외 코드를 제공한다.
- 보관함 조회가 요청 순서를 유지하면서 존재하는 실제 제품만 반환한다.
- 프로덕션 DTO와 Controller에 남아 있던 샘플 응답 생성 코드를 제거했다.
