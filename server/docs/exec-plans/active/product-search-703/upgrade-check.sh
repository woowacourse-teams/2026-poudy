#!/bin/sh
# 기존 DB에 새 마이그레이션을 더해도 검색 결과가 의도한 곳만 바뀌는지 본다.
# <이전 버전>까지 적용한 측정 DB를 만들고, 질의 세트의 search_products 결과(추천·목록·결과 유무)를 받은 뒤
# <새 버전>까지 더 적용하고 다시 받아 비교한다. 결과 파일은 <out-dir>/<db>-{before,after}.tsv 다.
#
# usage: upgrade-check.sh <poudy-private 경로> <이전 버전> <새 버전> <out-dir> [db 이름, 기본 poudy_upgrade]
set -eu
private=$1
from=$2
to=$3
out=$4
db=${5:-poudy_upgrade}
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
migrations=$(CDPATH= cd -- "$here/../../../../src/main/resources/db/migration" && pwd)
container=poudy-dev-postgres-1
mkdir -p "$out"

dump() {
    target=$1
    while IFS="$(printf '\t')" read -r id query; do
        case "$id" in \#*|'') continue ;; esac
        for call in "0, 20, 3" "0, null, 2" "0, 1, 2"; do
            printf '%s\t%s\t' "$id" "$call"
            docker exec "$container" psql -U poudy -d "$target" -Atc \
                "set jit = off; select total || ' ' || coalesce(corrected_query, '-') || ' ' || items::text from search_products('$query', $call)" \
                < /dev/null | tail -1
        done
    done < "$here/queries.tsv"
}

sh "$here/setup.sh" "$private" "$from" "$db" > /dev/null
for target in "$db" "${db}_x20"; do
    dump "$target" > "$out/$target-before.tsv"
    v=$((from + 1))
    while [ "$v" -le "$to" ]; do
        docker exec -i "$container" psql -U poudy -d "$target" -v ON_ERROR_STOP=1 -q -1 < "$(ls "$migrations"/V"$v"__*.sql)" > /dev/null
        v=$((v + 1))
    done
    docker exec "$container" psql -U poudy -d "$target" -qc "VACUUM ANALYZE" > /dev/null
    dump "$target" > "$out/$target-after.tsv"
    echo "== $target: 바뀐 행"
    diff "$out/$target-before.tsv" "$out/$target-after.tsv" | grep '^>' | cut -f1,2 | sort -u || true
done
