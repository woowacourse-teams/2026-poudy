#!/bin/sh
# usage: explain.sh <db> <sql-dir> <out-dir>
# 스크립트마다 한 번 실행해 auto_explain 으로 함수 안쪽 문장까지 실행 계획(ANALYZE, BUFFERS)을 남긴다. JIT 는 끈다.
set -eu
db=$1; sql=$2; out=$3
C=poudy-dev-postgres-1
rm -rf "$out"; mkdir -p "$out"
for f in $(ls "$sql" | sort); do
    {
        printf '%s\n' "SET jit = off;" "LOAD 'auto_explain';" "SET auto_explain.log_min_duration = 0;" \
            "SET auto_explain.log_analyze = on;" "SET auto_explain.log_buffers = on;" "SET auto_explain.log_timing = on;" \
            "SET auto_explain.log_nested_statements = on;" "SET auto_explain.log_level = notice;" "SET client_min_messages = notice;"
        cat "$sql/$f"
    } | docker exec -i $C psql -U poudy -d "$db" -X -q -o /dev/null > "$out/${f%.sql}.plan" 2>&1
done
