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
