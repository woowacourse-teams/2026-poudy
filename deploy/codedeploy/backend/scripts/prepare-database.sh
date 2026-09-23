#!/usr/bin/env bash

set -Eeuo pipefail

readonly ENV_FILE="${POUDY_BACKEND_ENV_FILE:-/etc/poudy/backend.env}"
readonly SCHEMA_FILE="${POUDY_SCHEMA_FILE:-/opt/poudy/backend/schema.sql}"

fail() {
    printf '[poudy-database] ERROR: %s\n' "$*" >&2
    exit 1
}

require_value() {
    local name="$1"
    [[ -n "${!name:-}" ]] || fail "${name} 환경 변수가 필요합니다: ${ENV_FILE}"
}

[[ -r "${ENV_FILE}" ]] || fail "환경 변수 파일을 읽을 수 없습니다: ${ENV_FILE}"
# backend.env is maintained by root and is also read by systemd EnvironmentFile.
# shellcheck disable=SC1090
source "${ENV_FILE}"

require_value POUDY_DB_URL
require_value POUDY_DB_USERNAME
require_value POUDY_DB_PASSWORD
[[ "${POUDY_DB_URL}" == jdbc:postgresql://* ]] || fail 'POUDY_DB_URL은 jdbc:postgresql:// 형식이어야 합니다.'
[[ -r "${SCHEMA_FILE}" ]] || fail "스키마 파일을 읽을 수 없습니다: ${SCHEMA_FILE}"
command -v psql >/dev/null 2>&1 || fail 'PostgreSQL psql 클라이언트가 필요합니다.'

readonly DATABASE_URL="${POUDY_DB_URL#jdbc:}"

psql_command() {
    PGPASSWORD="${POUDY_DB_PASSWORD}" psql \
        --no-psqlrc \
        --no-password \
        --set ON_ERROR_STOP=1 \
        --username "${POUDY_DB_USERNAME}" \
        --dbname "${DATABASE_URL}" \
        "$@"
}

scalar() {
    psql_command --tuples-only --no-align --command "$1" | tr -d '[:space:]'
}

psql_command --command 'select 1' >/dev/null

if [[ "$(scalar "select to_regclass('public.brand') is not null")" != 't' ]]; then
    printf '[poudy-database] 빈 DB에 스키마를 적용합니다.\n'
    psql_command --single-transaction --file "${SCHEMA_FILE}" >/dev/null
fi

catalog_rows="$(scalar 'select count(*) from brand')"
if [[ "${catalog_rows}" == '0' ]]; then
    require_value POUDY_DB_INITIAL_DATA_S3_URI
    command -v aws >/dev/null 2>&1 || fail '초기 데이터 다운로드에 AWS CLI가 필요합니다.'
    initial_data="$(mktemp /tmp/poudy-initial-data.XXXXXX.sql)"
    trap 'rm -f "${initial_data}"' EXIT
    aws s3 cp --only-show-errors "${POUDY_DB_INITIAL_DATA_S3_URI}" "${initial_data}"
    [[ -s "${initial_data}" ]] || fail '초기 데이터 SQL이 비어 있습니다.'
    printf '[poudy-database] 초기 카탈로그 데이터를 적용합니다.\n'
    psql_command --single-transaction --file "${initial_data}" >/dev/null
fi

readonly REQUIRED_TABLES=(
    brand
    category
    tag
    ingredient
    exclude_code
    exclude_code_ingredient
    product
    feedback
    feedback_image
    product_correction_request
    product_correction_request_image
    product_request
)

for table in "${REQUIRED_TABLES[@]}"; do
    [[ "$(scalar "select to_regclass('public.${table}') is not null")" == 't' ]] \
        || fail "필수 테이블이 없습니다: ${table}"
done

readonly REQUIRED_CATALOG_TABLES=(brand category tag ingredient exclude_code exclude_code_ingredient product)
for table in "${REQUIRED_CATALOG_TABLES[@]}"; do
    [[ "$(scalar "select exists(select 1 from ${table})")" == 't' ]] \
        || fail "초기 카탈로그 데이터가 없습니다: ${table}"
done

printf '[poudy-database] 연결, 스키마, 초기 카탈로그 검증을 통과했습니다.\n'
