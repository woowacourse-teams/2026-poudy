# 제품 검색 리팩터링 #975 인계

> 이 문서는 `68d64ffb` 시점의 중간 구현 인계 기록이다. 2026-10-27 V47 후속 구현과 로컬 검증을
> 완료했다. 2026-10-29 dev 마크 통합을 병합하면서 검색 마이그레이션 번호를 V47·V48로 옮겼다.
> 현재 상태는 [완료 계획](product-search-evidence-975.md),
> [검색 구조](../../product/product-search.md), [성능 보고서](../../performance/product-search-975.md)를 따른다.
> 아래의 미완료 설명은 당시 맥락을 보존한 것이며, 마이그레이션 번호는 현재 파일 기준으로 적는다.
> 완료 후 쓸 일이 없는 새 세션 시작 문구는 지웠다.

이전 대화 없이 후속 구현을 시작할 수 있도록 사용자 의도, 현재 코드, 보존할 정책과 검증 절차를 모았다.
2026-10-27 기준 **공통 일치 근거 도입과 중복 판정 축소까지만 구현했다. 전체 단계 분리는 미완료다.**
현재 구현을 완료 상태로 오해하지 않는 것이 가장 중요하다.

## 1. 작업 위치와 시작 순서

| 항목 | 값 |
| --- | --- |
| 작업 worktree | `/Users/wm/.codex/worktrees/product-search-evidence/2026-poudy` |
| 브랜치 | `refactor/975-search-evidence` |
| 구현 시작 기준 | `323a9ffa` (작업 시작 당시 `origin/dev`) |
| 중간 구현 커밋 | `0d34a9643ac61085fecbbfaa056c33dc01282840` (`refactor : 제품 검색과 연관검색어의 일치 근거 공유`) |
| 이슈 | https://github.com/woowacourse-teams/2026-poudy/issues/975 |
| 범위를 정정한 진행 댓글 | https://github.com/woowacourse-teams/2026-poudy/issues/975#issuecomment-6412361558 |
| 원래 checkout | `/Users/wm/Projects/2026-poudy` (별도 작업 위치이며 이 리팩터링 파일은 여기에 없음) |

먼저 위 worktree에서 `git status --short`, `git branch --show-current`, `git log -3 --oneline`을
확인한다. 원래 checkout으로 이동하거나 기존 변경을 덮어쓰지 않는다. 다른 기기에서는 로컬 경로가
없으므로 브랜치의 커밋을 전달받아야 한다. 이번 인계에서는 로컬 커밋만 만들며 원격 push·PR·배포는 하지 않는다.

다음 순서로 읽으면 된다.

1. 루트 `AGENTS.md`, `server/AGENTS.md`, 이 문서.
2. [진행 계획](product-search-evidence-975.md), [현재 제품 검색 구조](../../product/product-search.md).
3. `server/src/main/resources/db/migration/V47__product_search_match_evidence.sql` (인계 당시 V46).
4. `ProductQueryRepository`의 `candidates`, `find`, `count`, `suggest`, `relatedKeywords`.
5. `ProductSearchEvidenceTest`, [성능 보고서](../../performance/product-search-975.md).

저장소는 `server/` 밖 수정을 제한한다. API 생성물 두 파일은 verifier가 갱신할 때만 예외다.
새 브랜치가 필요하더라도 사용자 지시에 따라 이름에 `codex/`를 넣지 않는다.
커밋 전 `CONTRIBUTING.md`를 읽고 작성자·커미터를 확인한다. 이번 확인에서는 GitHub 계정
`gleaming9`와 로컬 Git 모두 `woomin kim <mathasdf0@gmail.com>`이었다. 공동 작성자·도구 서명을 넣지 않는다.
추가 에이전트 사용은 자동으로 가정하지 말고 해당 세션의 지침을 따른다.

## 2. 사용자가 원하는 결과

사용자는 검색 함수가 길고 정책이 뒤섞여 읽기 어렵다는 문제를 해결하려 한다.
MV를 확대하거나 검색엔진을 도입하는 것 자체가 목표가 아니다. 검색엔진의 분석·후보·정책·표시처럼
책임을 구분해, 정책 하나를 이해하거나 수정할 때 관련 단계만 읽을 수 있어야 한다.

합의한 목표 흐름은 다음과 같다.

```text
제품 데이터 → 저장용 문자열 분석 → 검색 MV·인덱스 ──┐
사용자 검색어 → 검색어 분석 ───────────────────────┼→ 후보 조회
속성·마크 현재 데이터 ────────────────────────────┘
후보 조회 → 일치 근거 계산 → 검색 정책·필터 → 순위·전체 개수·페이지 → 문구·강조
```

이 흐름은 논리적 책임 구분이다. 단계마다 Java와 DB를 왕복하거나 중간 결과를 영구 테이블로
저장하자는 뜻이 아니다. 한 SQL 요청 안에서 함수와 CTE를 연결할 수 있다.
오타 교정은 요청 필터 이전의 검색 성공 여부로 분기하므로 위 선형 흐름에 별도 분기를 추가해야 한다.
필터 선택지 집계도 자기 필터 그룹을 제외한 조건으로 갈라진다.

사용자는 공백·대소문자·초성·영문 읽기·토큰 분리를 Java에서 수행하는 안도 생각했지만
반드시 그렇게 해야 한다고 정하지 않았다. 현재 작업은 PostgreSQL 분석을 유지한다.
Java로 이전하거나 검색엔진·MV 확장을 추가하는 것을 후속 작업의 전제로 삼지 않는다.

## 3. 현재 구현과 부족한 부분

V46은 5개 복합 타입과 분석·후보·근거·정책·표시 함수를 도입했다. 기존 마이그레이션은 수정하지 않았다.
복합 타입은 요청 중 사용하는 값이며 검색용 테이블이 아니다.

| 현재 함수/값 | 역할 또는 남은 결합 |
| --- | --- |
| `search_product_analyze` / `product_search_part[]` | 전체 입력 ord=0과 필수 토큰 ord>0의 원문·비교값 |
| `search_product_candidate_ids` | 이름 인덱스 경로로 후보 ID 수집. 중복 ID가 나올 수 있으며 근거 조립에서 제거 |
| `search_product_metadata_matches` | 속성·마크 정의를 먼저 비교한 뒤 현재 제품 연결 조회 |
| `search_product_combination_matches` | 붙여 쓴 브랜드·제품의 최선 분할. **tier/ratio 정책도 아직 포함** |
| `search_product_name_matches` | 이름 필드별 일치. 토큰의 이름 tier는 미사용이므로 NULL, 전체 입력 tier만 계산 |
| `search_product_match_evidence` | 이름·메타데이터·결합 후보를 합쳐 필드 근거 배열과 분석 결과를 제품별로 보관 |
| `search_product_ranked_matches` | **포함 여부·등급·비율·표시 대상 선택이 함께 있음** |
| `search_product_evidence_page` | 전체 개수·정상 결과 존재 여부·검색 순위·페이지 근거 |
| `search_product_resolve` | 최초 검색, 필요 시 교정 후 같은 경로로 재검색 |
| `search_products_v2` | 기존 JSON 반환 계약 유지 |
| `search_product_related_prefix/ranges/keywords` | 같은 근거로 연관검색어 접두어와 원문 강조 계산 |

`ProductQueryRepository.relatedKeywords`의 약 110줄 SQL은 DB 함수 호출 한 줄로 바뀌었다.
검색과 연관검색어의 브랜드 분할·필드 판정 중복을 줄인 것이 이번 구현의 핵심이다.
V43 검색 본문 250줄은 역할별로 나뉘었고 가장 긴 V46 본문은 79줄이지만 전체 SQL 양과 함수 수는 늘었다.
함수 길이 감소만으로 전체 목표를 달성했다고 판단하면 안 된다.

목록·개수는 `search_products_v2(query,0,null,2)`의 전체 JSON을 펼쳐 Repository에서 필터·최종
정렬·개수·페이지·선택지를 계산한다. 상품 제안은 같은 함수에 페이지 크기를 전달한다.
연관검색어는 `search_product_related_keywords(query,limit,max_length)`를 사용한다.
기존 queries/metadata_hits/hits/core/page 진입점도 호환 계약 때문에 유지했다.

기존 계획을 completed에 두었던 것은 범위를 과장한 상태였다. 인계 시 active로 되돌리고
현재 구조 문서에도 중간 구현임을 명시했다. 이후 구현이 끝나기 전 이슈를 닫지 않는다.

## 4. 추가 구현 순서

### A. 일치한 사실과 정책 결정 분리

결합 근거는 브랜드·제품 조각, 브랜드가 앞인지, 브랜드 완전 일치인지, 제품 완전/접두/부분
일치인지 등을 반환하게 한다. 현재의 tier/ratio 계산은 검색 정책으로 옮긴다.
이름 필드도 일치 종류를 표현하고 정책이 그 의미를 등급으로 해석하게 한다.
단, 기존 등급·비율과 정렬 결과는 유지한다. 새 타입·함수 이름은 아직 확정하지 않았다.

### B. 후보와 근거 완성 구분

후보 조회는 제품 ID와 조회 과정에서 이미 확인한 사실을 함께 전달한다.
속성 정의를 찾아 연결된 제품을 얻었다면 그 일치를 다시 계산하지 않는다.
다음 단계는 아직 확인하지 않은 필드를 보완하고 근거 형식을 통일한다.
‘후보는 ID만, 비교는 전부 다음 단계’로 강제해 중복 판정을 되살리지 않는다.

### C. 정책·필터·순위·페이지를 관계형 행으로 연결

검색 인정 여부 → 요청 필터 → 최종 정렬 → 개수·페이지로 조합한다.
중간 전체 결과를 JSON으로 만든 뒤 다시 펼치는 경로를 줄인다.
Repository는 단계 조합 또는 DB 진입점 호출과 결과 매핑을 담당한다.
검색 관련도 재료를 미리 계산하는 것과 최종 순위를 매기는 것은 구분한다.
교정과 필터 선택지의 별도 분기는 아래 보존 계약을 따른다.

### D. 표시 선택을 페이지 이후로 이동

포함·정렬에 필요 없는 표시 필드·원문 조각 선택을 `ranked_matches`에서 뺀다.
상품 제안과 연관검색어는 페이지 ID에 해당하는 근거로 표시 대상·접두어·문구·강조를 계산한다.
표시 변경이 결과 포함·순위에 영향을 주지 않아야 한다.

### E. 요약과 상세 근거 전달 비용 개선

전체 후보의 포함·정렬에는 간결한 요약을, 페이지 표시에는 상세 근거를 사용한다.
제품마다 같은 분석 배열과 상세 배열을 여러 단계에 전달하는 현재 비용을 줄인다.
필드 근거를 관계형 행으로 공유하고 페이지에서 필요한 근거만 연결하는 안을 검토한다.
이 안의 성능은 아직 검증하지 않았다. 계획만 보고 개선됐다고 판단하지 않는다.

각 단계마다 기존 결과 비교를 먼저 통과시키고 성능을 측정한다. 마지막에 전체 verifier와
문서 갱신을 수행한다. 정책 변경과 구조 변경을 한꺼번에 진행하지 않는다.

## 5. 반드시 보존할 세부 계약

### 분석·필드 일치

- 전체 입력 ord=0과 중복 제거한 토큰 ord>0을 구분한다. 토큰 ord에 빈 번호가 있을 수 있으므로
  최대 ord를 토큰 수로 사용하지 않는다. 등록 표기 변환 후 중복도 제거된다.
- 전체 이름 비교는 정규형·읽기 사이의 교차 비교를 허용한다. 필수 이름 토큰은 기존처럼
  정규형끼리·읽기끼리 비교한다. 이를 무조건 같은 비교 함수로 통일하면 결과가 달라질 수 있다.
- 영어 브랜드 토큰은 정규형 비교다. 초성 확장과 일반 문자열 포함을 구분하는 `literal_match`는
  연관검색어 접두어 정책에 필요하다.
- 완성 표기 `선크림/썬크림`은 표준형을 사용하지만 `선크/썬크` 같은 미등록 부분 토큰은
  원래 열을 비교한다. 전체 입력에 등록 표기가 있어도 모든 토큰을 표준형으로 비교하면 안 된다.
- 속성값·마크 정의를 먼저 비교한 후 실제 연결된 제품만 인정한다. 정의만 존재하는 값은
  교정 후보로도 잘못 추가하지 않는다. 표시명·연결 변경은 MV REFRESH 없이 반영돼야 한다.

### 브랜드 결합·결과 포함·정렬

- 붙여 쓴 결합은 단일 토큰 질의에서 인정한다. 브랜드 조각은 완전 일치 또는 두 글자 이상 접두
  일치여야 한다. 역순도 허용하지만 품질이 다르다. `닥터지 블랙` 경계의 `지블`은 제외한다.
- 현재 결합 tier는 브랜드가 앞이고 브랜드·제품 모두 완전 일치면 0, 브랜드가 앞이고 브랜드
  완전·제품 접두 일치면 1, 나머지 2다. ratio는 `(brand_first + brand_exact + product_prefix + 1) / 4`다.
  같은 제품의 분할 선택은 tier, ratio 내림차순, 제품 조각 길이 내림차순, 조각의 C 정렬 순서다.
- 모든 필수 토큰은 같은 제품에서 충족해야 한다. API는 최대 tier=2를 사용하지만 기존 DB
  진입점의 부분 일치 tier=3도 유지한다. 이름 전용과 메타데이터 포함 호출을 모두 보존한다.
- 검색 기본 순서는 tier 오름차순, token_ratio 내림차순, 최근 조회수 내림차순, 이름 길이, 제품 ID다.
  조회수는 서울 날짜 기준 오늘을 포함한 기존 30일 범위를 유지한다.
- 가격순·최신순 등 사용자 정렬과 명시적 필터는 Repository 정책을 보존한다.
  필터 선택지 개수는 자기 그룹의 필터를 제외한 후보로 계산한다.

### 교정·페이지·표시

- 교정은 요청 필터나 페이지 이전에 전체 검색에 tier<=2가 하나도 없을 때만 시도한다.
  요청 max_tier=0/1이라 현재 페이지가 비어도 전체에 tier=2가 있으면 교정하지 않는다.
- 교정 검색은 요청한 max_tier 안에 결과가 있을 때만 채택한다. offset이 결과 수를 넘어도
  전체 개수와 corrected_query는 올바르게 유지해야 한다.
- 공개 함수의 기본 인자, 잘못된 페이지/등급 조건 거절, 빈 입력/null, limit=null 계약을 유지한다.
  기존 v2의 limit=null JSON에는 matchRange가 null로 들어간다.
- 표시 필드는 기존 이름 우선과 메타데이터 우선순위를 유지한다. 메타데이터는 속성값 우선,
  일치 조각 길이 내림차순, ord, term_key C 정렬 기준이다. 정확한 조건은 V43/V46 비교 테스트를 따른다.
- 강조는 정규화한 문자열의 위치가 아닌 실제 원문의 UTF-16 범위다. 길이가 다른 표기 규칙도
  `search_product_match_piece` 등 기존 원문 복원 도구로 처리한다.
- 연관검색어 강조 우선순위는 전체 입력 → 토큰 → 선택한 결합 → 접두어다.
  토큰 강조 순서는 기존 norm·ord 순서다. 상위 결과를 먼저 고른 뒤 길이 제한을 적용하며,
  길이 초과로 빠진 결과를 뒷순위로 보충하지 않는다.
- #930 관련 읽기 전체 일치에서 브랜드 접두어가 남는 기존 동작은 이번 리팩터링에서 고치지 않았다.
  정책 오류로 보여도 별도 변경으로 다루고 비교 테스트를 임의로 고치지 않는다.

## 6. 시행착오와 성능 근거

- SQL 함수를 나눈 초기 구현은 검색어 분석이 반복 평가되어 느려졌다. `search_product_hits`와
  `search_product_evidence_page`의 MATERIALIZED analysis는 요청당 분석을 한 번 준비하기 위한 것이다.
- `search_product_has_spelling`을 SQL에서 PL/pgSQL로 바꿨다. 중첩 분석 호출을 재사용한 뒤
  규칙 함수를 교체하면 이전 규칙 배열이 인라인 계획에 남는 문제가 있었다. 새 회귀 테스트가 이를 검증한다.
- 이름 필드 준비를 토큰 반복 밖으로 옮기고, 후보 경로는 UNION ALL로 수집한 뒤 근거 조립에서
  한 번 중복 제거한다. 내부 candidate_ids가 항상 고유 ID를 반환한다고 가정하면 안 된다.
- 미사용 이름 토큰 등급 계산과 이름이 맞은 제품의 메타데이터 표시 선택을 생략했다.
  비교 중간값을 무조건 MATERIALIZED로 바꾸면 오히려 넓은 검색이 느려진 사례도 있었다.
- 페이지가 있는 요청은 페이지의 근거 배열만 다음 단계에 넘긴다. 그러나 목록 검색의 limit=null은
  전체 후보를 반환하므로 이 최적화만으로 해결되지 않는다.

PostgreSQL 18.6, JIT off, 제품 1,044개(테스트 자료+같은 접두어 제품 1,000개), 경로·입력별
20회 준비 후 50회 전후 교대 측정이다. 표본 2,700개와 실행 계획 8개를 저장했다.
대표 입력은 빨라졌지만 `성능 검증 젤`의 목록 검색 p50은 10.727→14.727ms, p95는
10.908→14.938ms다. `ㅂ` 목록 검색도 10.458→12.291ms로 느려졌다.
운영 데이터·동시 요청·HTTP·JDBC 왕복·후속 필터 집계는 측정하지 않았다.

자료는 `server/docs/performance/product-search-975/`의 `benchmark.py`, `summary.tsv`,
`measurements.json.gz`에 있다. 과거 `/tmp/poudy-975`의 생성 스크립트는 이후 수정과 달라져
재실행하면 최적화와 버그 수정을 잃을 수 있다. 인계는 저장소 파일만으로 재현하며 임시 파일에 의존하지 않는다.

## 7. 검증과 전용 DB 재생성

현재 중간 구현은 2026-10-27 커밋 직전 재검증에서도 전체 테스트 1,781개(실패·오류·생략 0),
API 생성물 드리프트 없이 통과했다. 구현 커밋의 Java 포맷·코드 규칙 pre-commit 검사도 통과했다.
이는 중간 구현의 기능 회귀 확인이며 목표 구조 완성이나 운영 성능 승인을 의미하지 않는다.

중요한 비교 기준은 `ProductSearchEvidenceTest`다. V41/V43/V33 함수와 기존 연관검색어 SQL을
복원해 51개 입력 및 80개 추가 페이지·등급 조건, 총 284개 스냅샷을 비교한다.
필드 근거·선택한 결합·호출 계획 재사용 뒤 표기 규칙 변경도 다룬다.
`product-related-keywords-before-975.sql`은 비교 기준이므로 새 구현에 맞춰 고치지 않는다.
`ProductSearchMigrationTest`는 V40 이전 상태를 재현할 때 v2도 V33으로 복원하도록 수정했다.
새 v2가 V46 분석에 의존하므로 필요한 테스트 준비 변경이며 검증을 약화한 것이 아니다.

기존 PostgresSearchTest, ProductSearchStructureTest, ProductMetadataSearchTest,
ProductEquivalentSpellingTest, ProductSuggestionAndSearchTest와 연관검색어·필터 테스트도 유지한다.

**테스트의 `CleanMigrationConfig`가 스키마를 clean/migrate한다. 반드시 버려도 되는 전용 DB를 지정한다.**
기존 공유 개발 컨테이너 `poudy-dev-postgres-1`(5432)은 이 작업에 사용하지 않는다.
이전 `poudy-search-975` 컨테이너는 삭제했으며, 인계 검증용 컨테이너도 끝나면 삭제한다.

아래는 이 Mac에서 사용한 도구 경로와 재현 예다. 다른 환경에서는 설치된 Docker·Node 경로를 확인한다.
같은 이름의 컨테이너나 55475 포트가 사용 중이면 기존 것을 지우지 말고 새 이름·포트를 선택한다.

```sh
cd /Users/wm/.codex/worktrees/product-search-evidence/2026-poudy/server
SEARCH_DOCKER=/Users/wm/.local/share/mise/installs/docker-cli/29.8.2/docker/docker
"$SEARCH_DOCKER" run --name poudy-search-975-next \
  -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=poudy_search_975 \
  -p 127.0.0.1:55475:5432 -d postgres:18.6 -c jit=off
"$SEARCH_DOCKER" exec poudy-search-975-next pg_isready -U postgres -d poudy_search_975

export POUDY_TEST_DB_URL=jdbc:postgresql://127.0.0.1:55475/poudy_search_975
export POUDY_DB_USERNAME=postgres
export MISE_NODE_VERSION=22.23.3
sh ./scripts/test.sh --tests '*ProductSearchEvidenceTest' --tests '*ProductEquivalentSpellingTest'
sh ./scripts/verify.sh

python3 docs/performance/product-search-975/benchmark.py /tmp/product-search-975-next \
  "$SEARCH_DOCKER" exec -i poudy-search-975-next psql -U postgres -d poudy_search_975

# 이번에 만든 전용 컨테이너만 삭제한다.
"$SEARCH_DOCKER" rm -f poudy-search-975-next
```

`pg_isready`가 준비 완료를 반환한 뒤 테스트한다. 테스트가 UP-TO-DATE면 새 DB에는 스키마가
없을 수 있으므로 `test.sh --rerun-tasks`로 다시 적용한다. 벤치마크와 테스트는 같은 DB에서
동시에 실행하지 않는다. 벤치마크는 필요한 테스트 스키마가 적용된 후에 실행한다.
마지막 삭제 명령은 테스트와 측정이 끝난 뒤 직접 만든 컨테이너에만 실행한다.

Node shim에 버전이 없으면 generateApiZod가 실패한다. PATH만 바꾸는 것으로 해결되지 않았고,
설치된 버전을 `MISE_NODE_VERSION=22.23.3`으로 지정해 verifier를 통과했다.
Java는 Gradle의 Java 21 toolchain을 사용했다. 전역 버전 설정을 임의로 바꿀 필요는 없다.

## 8. 후속 세션에서 먼저 할 일

1. 브랜치·작업 파일과 최신 dev의 마이그레이션 번호 충돌 여부를 확인한다. 자동 reset·덮어쓰기는 하지 않는다.
2. V46은 인계 시 배포하지 않은 로컬 변경이다. 후속 수정 전에 배포·공유 여부를 다시 확인한다.
   이미 적용된 마이그레이션은 수정하지 말고 새 마이그레이션으로 이어간다.
3. 현재 비교 테스트를 재현한 뒤 A의 사실/정책 분리부터 시작한다. 신규 타입·함수 입출력을
   계획에 적고 단계별로 동등성을 확인한다.
4. 표시를 페이지 뒤로 옮길 때 필터·교정·선택지·limit=null 경로를 함께 검증한다.
5. 동일 조건으로 성능을 비교하고 넓은 검색의 회귀와 남은 제약을 숨기지 않는다.
6. 전체 verifier와 문서를 갱신하고, 완료 기준을 실제로 만족한 경우에만 완료 처리한다.

GitHub 연결 도구는 읽기는 됐지만 댓글 작성은 403이었다. 기존 진행 댓글은 사용자가 승인한
범위에서 `gh issue comment --body-file`로 작성했다. 새 댓글·메시지는 새 세션의 사용자 요청
범위를 확인하고 작성한다. 이 문서 자체를 외부 메시지 전송 승인으로 해석하지 않는다.
