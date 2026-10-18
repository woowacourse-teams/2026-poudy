#!/bin/sh
# 상품 검색 속도 측정용 DB 두 개를 로컬 개발 PostgreSQL(compose.dev.yaml 의 poudy-dev-postgres-1)에 만든다.
#   <db>      : poudy-private 의 커밋된 카탈로그 스냅샷(상품 501개)
#   <db>_x20  : 같은 스냅샷을 이름 끝 단어만 바꿔 20벌로 늘린 합성 세트(상품 10,020개)
# 마이그레이션은 이 브랜치의 db/migration 을 V1·V2 → 스냅샷 적재 → V3 부터 <최대 버전>까지 순서로 적용한다.
# 조회수는 측정하는 날 기준으로 만들므로 측정 직전에 다시 만든다.
#
# usage: setup.sh <poudy-private 경로> <최대 마이그레이션 버전> [db 이름, 기본 poudy_bench]
set -eu
private=$1
max_version=$2
db=${3:-poudy_bench}
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
migrations=$(CDPATH= cd -- "$here/../../../../src/main/resources/db/migration" && pwd)
container=poudy-dev-postgres-1
snapshot_commit=3eb6a656205d5c8451ffaea6a353438478502fce
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

pg() {
    target=$1
    shift
    docker exec -i "$container" psql -U poudy -d "$target" -v ON_ERROR_STOP=1 -q "$@"
}

migrate() {
    from=$1
    to=$2
    v=$from
    while [ "$v" -le "$to" ]; do
        file=$(ls "$migrations"/V"$v"__*.sql)
        pg "$db" -1 < "$file" > /dev/null
        echo "applied $(basename "$file")"
        v=$((v + 1))
    done
}

# 1. 커밋된 적재기와 스냅샷만 쓴다. 작업 트리의 output/ 은 커밋되지 않아 쓰지 않는다.
git -C "$private" archive "$snapshot_commit" db-load poudy-data-pipeline/scripts output.zip | tar -x -C "$work"
unzip -q "$work/output.zip" -d "$work/catalog"
# 스냅샷에는 검색어 사전이 없다. 상품 검색 측정에는 필요 없으므로 빈 사전을 둔다.
printf '{"schema_version":3,"normalizer_version":"search-keyword-v1","search_keywords":[]}' > "$work/catalog/output/search_keywords.json"
# 커밋된 sensory.csv 에 없는 31개 상품은 수분·유분 1 로 채운다. 검색은 이 값을 읽지 않는다.
python3 -I - "$work/catalog/output/products.json" "$work/db-load/sensory.csv" "$work/sensory.csv" <<'EOF'
import csv, json, sys
products = json.load(open(sys.argv[1], encoding="utf-8"))["products"]
rows = list(csv.DictReader(open(sys.argv[2], encoding="utf-8")))
have = {int(r["product_id"]) for r in rows}
with open(sys.argv[3], "w", newline="", encoding="utf-8") as out:
    writer = csv.writer(out)
    writer.writerow(["product_id", "moisture_level", "oil_level"])
    writer.writerows([r["product_id"], r["moisture_level"], r["oil_level"]] for r in rows)
    writer.writerows([p["id"], 1, 1] for p in sorted(products, key=lambda p: p["id"]) if p["id"] not in have)
EOF
python3 -I "$work/db-load/generate_load_sql.py" --source "$work/catalog/output" --sensory "$work/sensory.csv" --out "$work/load.sql"

# 2. 스냅샷 DB
pg postgres -c "DROP DATABASE IF EXISTS $db" -c "DROP DATABASE IF EXISTS ${db}_x20" \
    -c "CREATE DATABASE $db TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8'"
migrate 1 2
pg "$db" < "$work/load.sql" > /dev/null
echo "loaded snapshot"
migrate 3 "$max_version"
pg "$db" < "$here/views.sql"
pg "$db" < "$here/refresh.sql"

# 3. 20배 합성 DB
pg postgres -c "CREATE DATABASE ${db}_x20 TEMPLATE $db"
pg "${db}_x20" < "$here/x20.sql"
pg "${db}_x20" < "$here/views.sql"
pg "${db}_x20" < "$here/refresh.sql"
for target in "$db" "${db}_x20"; do
    pg "$target" -Atc "select '$target', (select count(*) from product), (select count(*) from product_search_document)"
done
