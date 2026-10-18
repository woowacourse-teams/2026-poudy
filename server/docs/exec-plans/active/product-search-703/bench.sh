#!/bin/sh
# usage: bench.sh <db> <sql-dir> <runs-per-round> <rounds> <warmup-runs> <out-dir>
# 질의·형식마다 pgbench 1 클라이언트로 잰다. 회차마다 모든 스크립트를 한 번씩 돌아 시간에 따른 치우침을 줄인다.
# JIT 는 끈다. 검색 SQL 은 예상 비용이 jit_above_cost 를 넘어 JIT 컴파일에만 약 0.9초를 쓰므로 켜면 검색 비용을 비교할 수 없다.
set -eu
db=$1; sql=$2; runs=$3; rounds=$4; warmup=$5; out=$6
C=poudy-dev-postgres-1
docker exec $C rm -rf /tmp/bench-sql /tmp/bench-log
docker exec $C mkdir -p /tmp/bench-log
docker cp "$sql" $C:/tmp/bench-sql > /dev/null
files=$(ls "$sql" | sort)
for f in $files; do
    docker exec -e PGOPTIONS="-c jit=off" $C pgbench -U poudy -n -c 1 -t "$warmup" -f /tmp/bench-sql/$f "$db" > /dev/null 2>&1
done
r=1
while [ $r -le "$rounds" ]; do
    for f in $files; do
        name=${f%.sql}
        docker exec -e PGOPTIONS="-c jit=off" $C pgbench -U poudy -n -c 1 -t "$runs" -f /tmp/bench-sql/$f -l --log-prefix=/tmp/bench-log/$name.r$r "$db" > /dev/null 2>&1
    done
    echo "round $r done"
    r=$((r + 1))
done
rm -rf "$out"; mkdir -p "$out"
docker cp $C:/tmp/bench-log/. "$out" > /dev/null
