# 검색어 버킷 측정 원자료

> 운영 칸은 이후 10분으로 정했다. 이 문서는 60초 버킷 시절의 과거 원자료다.

> 주의: 아래 표의 capped rows는 전역 entry 상한을 시험하던 역사적 측정이다. 현재 구현은
> 전역 상한을 사용하지 않으므로 현재 용량 보장으로 해석하지 않는다. drop 시뮬레이션의
> 원자료는 로컬 측정 디렉터리에만 보관했다.

측정기는 저장소에 두지 않는 로컬 프로브 `KeywordBudgetProbe`와 그 실행 스크립트다.
운영 산출물이 아니므로 커밋하지 않으며 수치만 여기 남긴다. 각 시나리오는
`-Xms128m -Xmx768m`의 새 JVM에서 실행했고, 성공·0건 저장소의 실제 entry 수를 검증했다.

| bucket | key | occupancy | ranking/zero entries | incremental heap MiB | copy p99 ms | refresh p95 ms | cached read p95 ms | JSON | restore ms |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 60s | 20 UTF-16 | 10% | 1,680 / 720 | 3.49 | 0.97 | 0.25 | 0.009 | 169,932 | 43 |
| 60s | 20 UTF-16 | 100% | 16,800 / 7,200 | 7.80 | 1.54 | 이전 단일 측정 | 이전 단일 측정 | 1,001,550 | 158 |
| 60s | 300 UTF-16 | 100% | 16,800 / 7,200 | 23.61 | 2.89 | 이전 단일 측정 | 이전 단일 측정 | 15,514,333 | 1,342 |

The 60-second 10% row includes the 120-sample refresh/cache distributions. The later
100% rows were run before the 120-sample cache distribution was added; their copy, memory,
file, and restore measurements remain valid. JSON was also written once with a diagnostic
1GiB repository to measure size; the production 64MiB save check passed in all three rows.

The current implementation has no configured global entry cap. The rows above that mention
16,800/7,200 are historical capped experiments only. Current memory and file behavior is
bounded by available host resources and the measured workload; the 100-entry label in old
rows is a historical harness parameter, not a production limit.
