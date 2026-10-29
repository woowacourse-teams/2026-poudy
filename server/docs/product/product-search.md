# 제품 검색 읽는 순서

제품 검색은 PostgreSQL에서 입력을 분석하고 후보와 일치 사실을 모은다. 검색 정책은 이 사실의
요약으로 포함 여부와 관련도 점수를 결정한다. 목록은 요청 필터를 적용한 뒤 최종 정렬·개수·페이지를
계산하며, 상품 제안과 연관검색어는 페이지에 든 제품의 상세 근거로 표시를 만든다.
V48은 이 경계를 연결한다. Java로 분석을 옮기거나 검색 MV·인덱스를 확대하지 않았다.

## 단계와 입출력

| 단계 | 입력 → 출력 | 소유 함수·코드 |
| --- | --- | --- |
| 저장용 분석 | 제품명·브랜드 → 정규형·읽기·초성·표준 표기 열 | 기존 `product_search_document` MV |
| 검색어 분석 | 원문 → 전체 입력 ord=0, 중복 없는 필수 토큰 ord>0 | `search_product_analyze` |
| 이름 후보 | 분석 결과 → 중복 가능 제품 ID | `search_product_candidate_ids` |
| 후보와 확인한 사실 | 이름 ID·현재 메타데이터 연결·브랜드 결합 → ID와 해당 사실 | `search_product_candidates` |
| 근거 완성 | 후보 ID → 아직 확인하지 않은 이름 필드 일치 | `search_product_name_facts`, `evaluate.fields` |
| 품질·포함 정책 | 일치 종류·결합 사실·토큰 충족 수 → 등급·토큰 비율 | `match_tier`, `combination_score`, `choose_combinations`, `policy` |
| 검색 결과 요약 | 정책 결과 → ID·등급·비율·최근 조회수·이름 길이 | `search_product_evaluate.scored` |
| 요청 필터·목록 | 검색 점수 행 → 필터 통과 행 → 정렬·개수·페이지·선택지 | `ProductQueryRepository` |
| 제안·연관검색어 페이지 | 검색 점수 행 → 정렬한 페이지 ID와 해당 상세 근거 | `search_product_evaluate.page`, `page_fields`, `page_details` |
| 표시 | 분석 결과와 페이지 상세 → 표시 필드·문구·원문 강조 | `search_product_present`, `search_product_related_prefix/ranges` |

표의 축약 함수명에는 `search_product_` 접두어가 붙는다. V48은
`src/main/resources/db/migration/V48__separate_product_search_stages.sql`에 있다.
이미 적용한 마이그레이션은 수정하지 않고 새 버전으로 변경한다.

예를 들어 `닥터지 썬크림 무기자차`는 브랜드·제품명·마크에 걸쳐 같은 제품에서 세 토큰이
충족됐다는 사실을 만든다. 포함 정책은 충족 수와 전체 입력의 일치 품질을 읽는다.
상품 제안은 페이지에 들어간 뒤에만 제품명과 메타데이터 중 표시 대상을 선택한다.

## 사실과 정책의 경계

`product_search_field_fact`는 제품 ID, ord, 필드, 원문, 비교 질의, 일치 종류, 메타데이터 키,
일반 문자열 일치 여부와 표준 표기 적용 여부를 담는다. 일치 종류는 EXACT/PREFIX/CONTAINS다.
이름의 필수 토큰은 충족 여부만 필요하므로 PRESENT를 쓰며 미사용 품질 비교를 하지 않는다.
전체 입력은 정규형·읽기 사이의 교차 비교를 허용하고, 필수 토큰은 기존처럼 같은 표현끼리 비교한다.

`product_search_combination_fact`는 브랜드·제품 조각, 브랜드가 앞인지, 브랜드 완전 일치,
제품 완전·접두 일치 여부를 담는다. 등급과 비율은 `combination_score`가 계산하고,
`choose_combinations`가 등급, 비율 내림차순, 제품 조각 길이 내림차순, 조각의 C 정렬 순서로
최선 분할을 고른다. 표시도 선택된 같은 조각을 받는다.

마크 표시명은 Java `Mark`가 소유한다. `MarkSqlParameters.definitions()`의 JSON을 Repository가
검색 진입점에 전달하고, 후보·교정 단계는 이 정의와 현재 `product_mark` 연결을 조회한다. 후보가 확인한 `field_fact`를
근거 완성 단계가 그대로 사용하므로 같은 메타데이터를 다시 검색하지 않는다.
요청의 표시명과 제품 연결 변경은 MV REFRESH 없이 반영된다. 이름 인덱스의 합친 문서는 후보만 좁히며,
실제 이름 필드 비교와 유효한 브랜드 결합이 `닥터지 블랙` 사이의 `지블` 같은 경계 일치를 제외한다.

`product_search_summary`에는 필수 토큰 충족 수와 품질만 있고 표시 원문은 없다.
`search_product_policy`는 이 요약만 읽어 포함 등급과 비율을 정한다.
전체 후보에 표시 필드나 원문 조각을 고르지 않으며, 요청 필터나 정렬을 수행하지도 않는다.

## 교정·필터·정렬의 순서

`search_product_resolve_result`가 최초 검색을 평가하고, 전체에 tier<=2가 하나도 없을 때만
기존 교정기로 다시 검색한다. 교정 결과는 요청 max_tier 안에 결과가 있을 때만 채택한다.
요청 max_tier가 0/1이거나 offset이 마지막 페이지를 넘어 빈 결과가 되어도 정상 결과 존재 여부와
교정된 검색어·전체 개수는 보존한다.

목록·개수는 `search_product_results(query, 2, marks)`의 관계형 점수 행을 받는다.
`ProductQueryRepository`가 요청 필터를 적용한 뒤 최종 정렬·개수·페이지를 계산한다.
검색 기본 순서는 등급, 토큰 비율 내림차순, 최근 조회수 내림차순, 이름 길이, ID다.
조회수는 서울 날짜 기준 오늘을 포함한 기존 30일 범위를 쓴다.
가격순·최신순과 검색어 없는 목록의 조회수 기간은 기존 Repository 정책을 유지한다.

선택지는 같은 검색 결과에서 자기 필터 그룹만 제외한 후보로 집계한다.
교정은 그보다 앞에서 끝나므로 명시적 브랜드·마크 필터로 목록이 비었다고 다시 교정하지 않는다.
목록·개수 경로에는 전체 JSON 생성·해체와 표시 계산이 없다.

## 페이지 이후 표시와 전달 비용

`search_product_evaluate`는 후보·필드 사실을 관계형 CTE로 한 번 공유한다.
이름 경로에서 중복 ID를 작은 값일 때 줄이고, 다중 토큰에는 불필요한 결합 문서 조회를 하지 않는다.
이름 필드 준비는 후보 ID를 집합으로 펼쳐 문서와 조인한다. 큰 ID 배열을 제품마다 비교하지 않는다.
순위 재료는 `product_search_score`의 다섯 값으로 전달한다. 분석 배열은 요청당 하나이며,
`product_search_detail`의 필드 배열과 선택한 결합은 요청 페이지에 대해서만 조립한다.
목록·개수는 `p_details=false`이므로 상세 배열이 비어 있다.
복잡한 단계 조합을 요청마다 재계획하는 고정 비용을 줄이기 위해 `evaluate` 내부에서만
`plan_cache_mode=force_generic_plan`을 사용한다. 다른 DB 요청의 설정은 바꾸지 않는다.
인덱스 선택과 자료 규모에 따른 영향은 성능 보고서의 실행 계획·1,000개/10,000개 측정으로 확인한다.

상품 제안은 `search_product_suggestions(query, offset, limit, tier, marks)`의 관계형 행을 매핑한다. 페이지 ID와 위치를 확정한 뒤
`search_product_present`가 이름 우선, 메타데이터 내부 우선순위, 원문 조각 선택을 적용한다.
표시가 빈 행을 반환해도 이미 고른 ID와 순위가 사라지지 않도록 연결한다.
연관검색어는 같은 페이지 상세에서 접두어와 강조를 만들며, 길이 제한은 상위 결과를 고른 뒤 적용한다.
길이 때문에 빠진 자리를 뒷순위로 채우지 않는다.

강조는 실제 원문의 UTF-16 범위다. 길이가 다른 표준 표기는 `search_product_match_piece`로
원문 조각을 복원한다. 연관검색어 강조의 전체 입력 → 토큰 → 결합 → 접두어 우선순위와,
#930의 읽기 전체 일치 때 브랜드 접두어가 남는 기존 정책도 유지한다.

## 호환 호출과 검증

기존 `queries`, `metadata_hits`, `hits`, `core`, `page`, `resolve`, `ranked_matches`와
`search_products_v2`는 기존 타입·기본 인자·JSON 계약과 V46 마크 통합의 `p_marks jsonb` 인자를 유지한다.
마크를 사용하는 진입점과 내부 연결의 마지막 인자는 같은 요청 정의다. 기본값 `[]`은 마크 정의 없이
이름만 검색하는 호출을 지원하며, 교정 재검색에도 최초 요청의 정의를 전달한다. 내부 tier=3도 남는다.
`search_products_v2(query,0,null,...)`는 요청 자체가 전체 표시 결과를 요구하므로 모든 상세를 조립하고
`matchRange=null`을 반환한다. 이 호환 경로는 새 목록 API 경로보다 비싸다.
기존 `match_evidence`는 후보 전체의 상세를 직접 검사하는 호환 진입점이며 운영 목록 경로가 아니다.

`ProductSearchEvidenceTest`는 기존 284개 비교 입력·페이지 스냅샷과 관계형 점수 비교 51개를
유지한다. 비교 함수는 V43의 검색 정책을 이어받은 dev `V46__unify_product_marks.sql`에서 별도
이름으로 복원해 같은 마크 정의로 호출한다. 과거 연관검색어 기준 SQL은 인자만 보완해 사용한다. `ProductSearchStagesTest`는 일치 사실과 결합 방향, 페이지 상세 범위, 표시 변경에 대한
포함·순위 독립성, 빈 페이지와 교정 시점, null 입력을 검증한다.
마크 정의가 후보·교정·점수·페이지 표시·연관검색어까지 전달되는 사례를 추가했다.
기존 메타데이터·표준 표기·필터·연관검색어 테스트도 유지한다.
2026-10-29 dev 병합 후 테스트·성능 측정은 사용자 요청으로 재실행하지 않았다.
측정 조건·남은 회귀·운영 검증 한계는 [성능 보고서](../performance/product-search-975.md)에 기록한다.
