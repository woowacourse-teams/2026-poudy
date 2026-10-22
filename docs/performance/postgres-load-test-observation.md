# PostgreSQL load test observation

Use this procedure for the read-only staging load test. Staging and production share
one PostgreSQL host, so keep the existing stop conditions from #679. Do not reset
`pg_stat_statements`: its counters are shared-host state and resetting them would erase
production history too.

## Before and after each load step

Connect to `poudy_staging` with a read-only operator account and capture the query
statistics for that database. Keep the output with the test record; do not paste SQL
text, credentials, or unrestricted query output into Prometheus, Loki, or public issue
comments.

```sql
SELECT (SELECT stats_reset FROM pg_stat_statements_info) AS stats_reset,
       queryid,
       calls,
       round(total_exec_time::numeric, 2) AS total_exec_ms,
       round(mean_exec_time::numeric, 2) AS mean_exec_ms,
       rows,
       shared_blks_hit,
       shared_blks_read,
       temp_blks_read,
       temp_blks_written
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND userid = (SELECT oid FROM pg_roles WHERE rolname = 'poudy_user')
ORDER BY total_exec_time DESC
LIMIT 20;
```

Take one snapshot immediately before and after each load step. Compare deltas for
`calls`, `total_exec_ms`, rows, shared block reads, and temporary blocks using the
same `queryid`. Also note the database `stats_reset` time. A query ID identifies a
normalized statement; inspect its SQL only in the authenticated staging DB session
when selecting a representative query for plan analysis.

## Inspect a representative read query

Only run a `SELECT` copied from staging. `EXPLAIN ANALYZE` executes the query, so set
timeouts and use a read-only transaction. Start with the slow/high-total-time query
IDs observed during the load; do not run broad production queries.

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)
SELECT ...; -- replace with the selected staging SELECT
ROLLBACK;
```

Record planning and execution time, actual versus estimated rows, loops, shared hit
and read blocks, temporary I/O, and the plan node responsible for the largest cost.
Keep the SQL and plan in a restricted team record if they contain sensitive values;
publish only a redacted plan or query ID in a broadly visible issue.

## Dashboard interpretation

- Backend staging/production dashboards show route p95/p99, Hikari active/idle/pending
  connections, Tomcat busy/current/max threads, and JVM GC pause rates.
- The shared database dashboard shows host disk throughput, active wait events by
  logical database, and staging query IDs ranked by execution time and mean time.
- `pg_stat_statements` SQL text collection is disabled. The query ID and user labels
  are still operational metadata; keep access to the metrics dashboard scoped to the
  team.
- PostgreSQL metrics scrape every 30 seconds during normal operation. Compare scrape
  freshness with query cost and database host resource use; this is an observation
  interval, not a guarantee that every short-lived event will be captured.

The exporter changes require Alloy reload/restart on the DB host. They do not require
a PostgreSQL restart or extension change. If the collector fails or affects DB
headroom, restore the prior Alloy config and return the PostgreSQL scrape interval to
60 seconds.

## 쿼리 번호와 사용자 이름

`queryid`는 같은 형태의 SQL을 구별하는 번호입니다. 번호만으로 내용을 알 수는
없습니다. `poudy_user`는 그 SQL을 실행한 DB 계정이며 Grafana 사용자나 API 이름이
아닙니다. 같은 번호라도 DB와 계정이 다르면 별도 통계이므로 함께 확인합니다.

SQL 원문은 공개 지표에 넣지 않고, 인증된 DB 세션에서 필요한 번호만 조회합니다.
아래 `123`은 대시보드에서 확인한 번호로 바꿉니다. 결과에 민감한 값이 있을 수
있으므로 원문을 공개 이슈나 로그 수집기로 복사하지 않습니다.

```sql
SELECT s.queryid, r.rolname AS db_role, d.datname AS database, s.query
FROM pg_stat_statements AS s
JOIN pg_roles AS r ON r.oid = s.userid
JOIN pg_database AS d ON d.oid = s.dbid
WHERE d.datname = 'poudy_staging'
  AND r.rolname = 'poudy_user'
  AND s.queryid = 123;
```

## 연결 대기와 느린 SQL의 비교

스테이징의 `Hikari Connection Acquisition Wait` 패널은 연결을 빌리기까지의
대기 시간(ms)입니다. 평균은 최근 5분의 sum/count 증가율로 계산합니다.
최대는 Micrometer 타이머의 time-window 값이므로 최근 5분 최대와 같지 않습니다.
요청이 없으면 평균 계산의 분모가 0이 되어 선이 비어 보일 수 있습니다.

대기 증가 → pending/active 확인 → 같은 시간대의 SQL 통계와 슬로 쿼리 로그 확인
순서로 봅니다. 대기가 늘었다는 이유만으로 풀을 늘리면 느린 DB에 동시 요청을
더 보내게 됩니다. 연결 사용시간도 함께 보고 왜 반환이 늦는지 먼저 확인합니다.

대시보드 JSON 변경은 수집 설정 변경이 아닙니다. 모니터 EC2의 기존 파일
프로비저닝 경로에 최신 JSON을 반영한 후 패널과 아래 지표를 확인합니다.
Alloy의 `poudy_backend_actuator` job과 `environment="staging"` 라벨을 사용합니다.

- `hikaricp_connections_acquire_seconds_sum`, `_count`, `_max`
- `hikaricp_connections_pending`, `hikaricp_connections_active`
- `hikaricp_connections_usage_seconds_sum`, `_count`

문제가 있으면 해당 대시보드 JSON만 이전 버전으로 되돌립니다.

## 슬로 쿼리 로그 설정 이력

2026-10-14 공유 DB에서 다음 값을 적용하고 reload로 확인했습니다.
당시 PostgreSQL은 active였고 postmaster 시작 시각이 같아 재시작은 없었습니다.
현재 값은 아래 쿼리로 다시 확인합니다. 이 문서가 자동으로 설정을 적용하지는 않습니다.

| 설정 | 당시 값 | 목적 |
|---|---|---|
| `log_min_duration_statement` | 250ms | 느린 SQL 기록 |
| `log_parameter_max_length` | 0 | 바인드 파라미터 값 출력 억제 |
| `log_line_prefix` | `%m [%p] %q%u@%d queryid=%Q ` | 시간, PID, DB 계정, DB, queryid 구분 |

```sql
SELECT name, setting, unit, source, pending_restart
FROM pg_settings
WHERE name IN ('log_min_duration_statement', 'log_parameter_max_length',
               'log_line_prefix', 'logging_collector', 'log_directory');
```

`logging_collector=on`인 파일 로그는 journal 수집만으로 Loki에 들어가지 않습니다.
10/14에는 Alloy의 파일 읽기 권한과 DB용 logs-write 토큰이 없어 호스트에서만
확인했습니다. 지표 전용 토큰을 로그 전송에 재사용하지 않습니다.
바인드 값을 숨겨도 SQL에 직접 쓴 상수는 남을 수 있습니다.

당시 로그 회전은 일 단위와 10MiB, 루트 디스크 사용률은 18%였습니다.
공유 DB 설정이므로 운영과 스테이징 모두에 영향을 줍니다. 변경 전 설정 백업은
`/var/lib/pgsql/data/postgresql.auto.conf.before-slow-query-logging-20261014`이며,
되돌릴 때는 현재 설정과 먼저 대조하고 필요한 항목만 복원한 후 reload합니다.
