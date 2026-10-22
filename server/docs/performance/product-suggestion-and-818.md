# 상품 추천 AND 검색 수정 #818 검증

## 변경과 기준 버전

- 이슈: [#818](https://github.com/woowacourse-teams/2026-poudy/issues/818), 상위 규칙: [#703](https://github.com/woowacourse-teams/2026-poudy/issues/703)
- 기준 `origin/dev`: `85855e94f4dd80ba16eb4bf24290ec64de00a627`
- 상품 추천의 `search_products(:keyword, :offset, :size, 3)` 호출만 최대 등급 `2`로 바꾼다.
- DB 함수·인자·반환 타입·HTTP 응답 구조는 유지한다. 내부에서 등급 3을 명시적으로 요청하는 호출도 유지한다.
- 전체 개수·정렬·페이지·교정 재검색은 기존 DB 함수가 같은 최대 등급으로 계산한다.

## 기능 검증

기존 검색 통합 테스트 3개 클래스를 기준선으로 실행해 통과했다. 별도의 AND 검색 fixture와
`ProductSuggestionAndSearchTest`를 추가해 수정 전 코드에서 브랜드 조건·띄어 쓴 다중 조건·부분 입력·초성·교정·페이지의
실패를 확인했다. 붙여 쓴 브랜드 조합은 수정 전에도 통과했다. 이후 추천 조회 제한과 기존 API 기대값을 함께 수정했다.

회귀 테스트는 다음 동작을 고정한다.

- `로션`에 브랜드를 추가하면 그 브랜드의 로션만 남는다. 같은 브랜드의 크림과 다른 브랜드의 로션을 제외한다.
- 브랜드·제품명의 입력 순서, 붙여쓰기, 기존 부분 입력과 초성에서도 나머지 조건을 유지한다.
- `로션 닥터지 앰플`의 여섯 입력 순서 모두 한 상품이 모든 조건을 만족해야 한다. 서로 다른 상품의 조건을 합치지 않는다.
- 전체 일치가 없을 때는 빈 목록·전체 개수 0, 있을 때는 전체 일치 상품만 반환한다.
- 오타 교정 뒤에도 브랜드 조건을 유지하고 실제 교정된 원문 구간을 강조한다.
- 일부 일치를 제외한 뒤 페이지를 나누고 전체 개수·순서·강조 구간을 유지한다.
- 목록·count·필터 선택지·결과 존재 확인과 추천이 같은 전체 일치 기준을 사용한다.
- 기존 `PostgresSearchTest`의 등급 3 검사는 내부 호출 호환성 검사로 남긴다.

최종 `sh ./scripts/verify.sh`에서 API 생성물 드리프트 없이 전체 빌드와 테스트 1,577개가 통과했다.
실패·오류·건너뛴 테스트는 모두 0개다.

## 성능 측정 조건

측정 대상은 HTTP 왕복을 제외한 실제 Repository 호출이다. 테스트 DB의 25개 상품을 사용하며 운영 카탈로그의
부하 한계를 평가하는 자료는 아니다. 새로 검색 범위를 넓히는 기능은 없고, 추천에서 잘못 포함하던 후보를 제외한다.

- PostgreSQL `18.6`, UTF-8, `C.UTF-8`, Java `21.0.12.1`, macOS aarch64
- `shared_buffers=128MB`, `work_mem=4MB`, `max_parallel_workers_per_gather=2`, `jit=on`, `statement_timeout=0`
- 동시 호출 1개. 한 트랜잭션에서 같은 fixture를 읽고 측정 후 롤백한다.
- 페이지 크기 20. `검증토너`는 2페이지, 목록·count에 브랜드 ID 90000 필터를 적용한다. 다른 입력은 1페이지·필터 없음이다.
- 추천은 필터 인자를 받지 않으므로 같은 입력·페이지·크기로만 비교한다. 결과 존재 확인은 기존 Repository의 조건을 그대로 쓴다.
- 입력 9개 × 추천·목록·count·결과 존재 확인 4개 경로로 36개 조합을 고정했다.
- `afterMigrate__test_data.sql` SHA-256: `ab59d8e7551dbcd51d062330cbf7581377077b3c0e67e0ab4030dac9afbf5f47`
- `search-test-data.sql` SHA-256: `60a8ffecb763c9dea88d016deac7a03b4060dd1317713641892f2157123b24ca`
- `product-suggestion-and-test-data.sql` SHA-256: `9654529444fba86cff1988fb90da44fc2fb16b4952b6ff20f828ae5790a74c8a`
- 별도 사전 변경은 없다. 기존 카탈로그 어휘와 fixture를 동일하게 유지한다.

처음에는 기준 코드와 수정 코드를 별도 JVM에서 각각 워밍업 30회, 40개 표본씩 5구간으로 측정했다.
코드를 바꾸지 않은 경로에도 차이가 생겨, 같은 JVM에서 이전 SQL과 수정 SQL을 번갈아 호출하는 방식으로
비교했다. 이 두 번째 측정은 워밍업을 양쪽 50회씩 하고, 100개 표본씩 5구간을 기록한다.
호출 순서는 표본마다 뒤집어 어느 쪽이 항상 먼저 실행되는 편향을 줄였다.

이전 SQL은 현재 Repository의 추천 호출에서 마지막 인자만 3으로 되돌려 실행한다. 나머지 Repository와
자료·연결·트랜잭션은 같다. 수정 SQL은 실제 변경 코드의 2를 사용한다. 판정은 변경 후 전체 표본의 p95가
이전 호출을 구간별로 측정한 p95 중 최댓값을 넘지 않는지 확인한다. p50·p95는 가장 가까운 위쪽 순위의 표본이다.

첫 교차 측정에서 변경하지 않은 초성 `ㅂ`의 목록 호출만 2.222ms 기준에 2.236ms로 0.014ms 초과했다.
해당 조합을 같은 워밍업·구간·표본 수로 한 번 추가 확인했으며, 최초 표본도 버리지 않고 합쳤다.
이 조합은 버전별 1,000개 표본과 기준 10구간을, 나머지는 버전별 500개 표본과 기준 5구간을 사용한다.
합친 초성 목록의 p95는 2.320ms, 이전 호출 구간의 최대 p95는 2.687ms였다.

## 결과

36개 조합 모두 위 비교 기준을 통과했다. 아래는 추천 조회의 p95이며 단위는 ms이다.
후보가 줄어든 입력의 결과 수 변화도 함께 기록했다.

| 입력 | 이전 구간 p95 최댓값 | 변경 후 p95 | 전체 결과 수 |
| --- | ---: | ---: | ---: |
| `로션` | 1.636 | 1.463 | 4 → 4 |
| `에스트라 로션` | 1.579 | 1.317 | 5 → 2 |
| `로션 닥터지 앰플` | 1.943 | 0.895 | 6 → 0 |
| `에스트라 로` | 1.896 | 1.313 | 5 → 2 |
| `ㅂ` | 2.829 | 2.621 | 21 → 21 |
| `피디알엔` | 1.186 | 1.152 | 1 → 1 |
| `검증스내일` | 2.349 | 2.294 | 1 → 1 |
| `라운드랩검증독도` | 1.262 | 1.214 | 1 → 1 |
| `검증토너` | 0.812 | 0.623 | 5 → 5 |

전체 경로의 p50·p95·표본 수·판정·결과 수는 [summary.tsv](product-suggestion-and-818/summary.tsv)에 있다.
환경 설정은 [environment.tsv](product-suggestion-and-818/environment.tsv), `EXPLAIN (ANALYZE, BUFFERS)`는
[이전 호출](product-suggestion-and-818/before-plans.txt)과 [변경 호출](product-suggestion-and-818/after-plans.txt)에 보관했다.
실행 계획은 `search_products()` 호출 단위의 `Function Scan`과 버퍼 사용량을 보여준다. 내부 함수의 각 SQL 노드를
분리해서 계측한 자료는 아니다.

## 재현

교차 측정에 사용한 임시 테스트 원문은 [benchmark.java.txt](product-suggestion-and-818/benchmark.java.txt)에 보관한다.
일반 테스트나 빌드에 이 측정을 추가하지 않는다. 같은 로컬 테스트 DB가 준비된 환경에서 `server/`에서 실행한다.
측정 중에는 다른 테스트나 OpenAPI 생성을 같은 DB에서 실행하지 않는다.

```sh
mkdir -p src/test/java/com/poudy/product/repository /tmp/poudy-search-818
cp docs/performance/product-suggestion-and-818/benchmark.java.txt src/test/java/com/poudy/product/repository/Search818BenchmarkTest.java
POUDY_818_PHASE=paired sh ./scripts/test.sh --tests com.poudy.product.repository.Search818BenchmarkTest
rm src/test/java/com/poudy/product/repository/Search818BenchmarkTest.java
```

결과는 `/tmp/poudy-search-818/benchmark-paired.tsv`에 기록된다. 위의 추가 확인은 원문에서 입력을 `ㅂ`, 경로를
`CATALOG`만 남기고 같은 조건으로 실행했다. 저장된 요약은 두 실행의 모든 표본을 합친 값이다.
