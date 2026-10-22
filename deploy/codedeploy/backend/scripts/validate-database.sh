#!/usr/bin/env bash

set -Eeuo pipefail

readonly ENV_FILE="${POUDY_BACKEND_ENV_FILE:-/etc/poudy/backend.env}"

fail() {
    printf '[poudy-database] ERROR: %s\n' "$*" >&2
    exit 1
}

require_value() {
    local name="$1"
    [[ -n "${!name:-}" ]] || fail "${name} 환경 변수가 필요합니다: ${ENV_FILE}"
}

[[ -r "${ENV_FILE}" ]] || fail "환경 변수 파일을 읽을 수 없습니다: ${ENV_FILE}"

# backend.env is read by systemd EnvironmentFile and docker --env-file, neither
# of which expands `$`. Sourcing it would expand `$` in values such as BCrypt
# hashes, so read only the keys this check needs, without shell evaluation.
env_value() {
    local value
    value="$(sed -n "s/^$1=//p" "${ENV_FILE}" | tail -n 1)"
    if [[ "${value}" =~ ^\'(.*)\'$ || "${value}" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
    fi
    printf '%s' "${value}"
}

POUDY_DB_URL="$(env_value POUDY_DB_URL)"
POUDY_DB_USERNAME="$(env_value POUDY_DB_USERNAME)"
POUDY_DB_PASSWORD="$(env_value POUDY_DB_PASSWORD)"
POUDY_FEEDBACK_S3_BUCKET="$(env_value POUDY_FEEDBACK_S3_BUCKET)"
POUDY_FEEDBACK_S3_PENDING_PREFIX="$(env_value POUDY_FEEDBACK_S3_PENDING_PREFIX)"

require_value POUDY_DB_URL
require_value POUDY_DB_USERNAME
require_value POUDY_DB_PASSWORD
require_value POUDY_FEEDBACK_S3_BUCKET
require_value POUDY_FEEDBACK_S3_PENDING_PREFIX
[[ "${POUDY_DB_URL}" == jdbc:postgresql://* ]] || fail 'POUDY_DB_URL은 jdbc:postgresql:// 형식이어야 합니다.'
[[ "${POUDY_FEEDBACK_S3_PENDING_PREFIX}" == poudy/*/ ]] \
    || fail 'POUDY_FEEDBACK_S3_PENDING_PREFIX는 poudy/ 아래에서 /로 끝나야 합니다.'
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
    local label="$1"
    local output
    output="$(psql_command --tuples-only --no-align --command "$2")" \
        || fail "${label} 조회에 실패했습니다. 위 PostgreSQL 오류를 확인하세요."
    printf '%s' "${output}" | tr -d '[:space:]'
}

psql_command --command 'select 1' >/dev/null \
    || fail "DB 연결 또는 인증에 실패했습니다. ${ENV_FILE}의 DB 설정과 네트워크 허용 여부를 확인하세요."

database_name="$(scalar 'DB 이름' 'select current_database()')"
printf '[poudy-database] 검증 대상 DB=%s, 사용자=%s\n' "${database_name}" "${POUDY_DB_USERNAME}"

readonly REQUIRED_TABLES=(
    brand
    category
    tag
    ingredient
    exclude_code
    exclude_code_ingredient
    product
    feedback
    product_correction_request
    product_request
)

for table in "${REQUIRED_TABLES[@]}"; do
    result="$(scalar "테이블 ${table}" "select to_regclass('public.${table}') is not null")" || exit 1
    [[ "${result}" == 't' ]] \
        || fail "필수 테이블이 없습니다: ${table}"
done

readonly REQUIRED_SEARCH_RELATIONS=(product_search_document ingredient_search_term search_vocabulary)
for relation in "${REQUIRED_SEARCH_RELATIONS[@]}"; do
    result="$(scalar "검색 뷰 ${relation}" "select to_regclass('public.${relation}') is not null")" || exit 1
    [[ "${result}" == 't' ]] \
        || fail "필수 검색 뷰가 없습니다: ${relation}. search.sql 적용 상태를 확인하세요."
done

readonly REQUIRED_SEARCH_FUNCTIONS=(
    'search_products(text,bigint,integer,integer)'
    'search_ingredients(text,integer,integer,integer)'
    'search_product_names(text,bigint)'
)
for function in "${REQUIRED_SEARCH_FUNCTIONS[@]}"; do
    result="$(scalar "검색 함수 ${function}" "select to_regprocedure('public.${function}') is not null")" || exit 1
    [[ "${result}" == 't' ]] \
        || fail "필수 검색 함수가 없습니다: ${function}. search.sql 적용 상태를 확인하세요."
done

readonly REQUIRED_CATALOG_TABLES=(brand category tag ingredient exclude_code exclude_code_ingredient product)
for table in "${REQUIRED_CATALOG_TABLES[@]}"; do
    result="$(scalar "카탈로그 ${table}" "select exists(select 1 from ${table})")" || exit 1
    [[ "${result}" == 't' ]] \
        || fail "초기 카탈로그 데이터가 없습니다: ${table}"
done

printf '[poudy-database] 연결, 스키마, 검색 객체, 카탈로그 검증을 통과했습니다. DB는 변경하지 않았습니다.\n'
