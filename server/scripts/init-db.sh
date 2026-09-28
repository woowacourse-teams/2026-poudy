#!/bin/sh
set -eu

server_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

exec psql "$@" -X -v ON_ERROR_STOP=1 --single-transaction \
    -f "$server_root/src/main/resources/db/schema.sql" \
    -f "$server_root/src/main/resources/db/search.sql"
