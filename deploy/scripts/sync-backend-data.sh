#!/usr/bin/env bash

set -Eeuo pipefail

readonly DATA_S3_URI="${POUDY_DATA_S3_URI:-s3://techcourse-project-2026/poudy/data/}"
readonly DATA_DIR="${POUDY_DATA_DIR:-/opt/poudy/data}"
readonly STATE_DIR="${POUDY_DATA_STATE_DIR:-/var/lib/poudy/backend-data}"
readonly STATE_FILE="${STATE_DIR}/s3-fingerprint"
readonly SERVICE_NAME='poudy-backend.service'
readonly HEALTH_URL="${POUDY_DATA_HEALTH_URL:-http://127.0.0.1:8080/actuator/health}"
readonly LOCK_FILE='/run/poudy-backend-data-sync.lock'
readonly EXPECTED_FILES=(
    brands.json
    categories.json
    exclude_codes.json
    ingredients.json
    products.json
    tags.json
)

log() {
    printf '[poudy-data-sync] %s\n' "$*"
}

fail() {
    printf '[poudy-data-sync] ERROR: %s\n' "$*" >&2
    exit 1
}

require_root() {
    [[ "${EUID}" -eq 0 ]] || fail 'root 권한이 필요합니다.'
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "필수 명령을 찾을 수 없습니다: $1"
}

parse_s3_uri() {
    [[ "${DATA_S3_URI}" =~ ^s3://([^/]+)(/(.*))?$ ]] \
        || fail "S3 URI 형식이 올바르지 않습니다: ${DATA_S3_URI}"

    S3_BUCKET="${BASH_REMATCH[1]}"
    S3_PREFIX="${BASH_REMATCH[3]:-}"
    if [[ -n "${S3_PREFIX}" && "${S3_PREFIX: -1}" != '/' ]]; then
        S3_PREFIX+='/'
    fi
}

calculate_fingerprint() {
    aws s3api list-objects-v2 \
        --bucket "${S3_BUCKET}" \
        --prefix "${S3_PREFIX}" \
        --output json \
        | jq -r '.Contents[]? | [.Key, .Size, .ETag, .LastModified] | @tsv' \
        | LC_ALL=C sort \
        | sha256sum \
        | awk '{print $1}'
}

validate_data() {
    local file root

    for file in "${EXPECTED_FILES[@]}"; do
        [[ -s "${staging_dir}/${file}" ]] \
            || fail "필수 데이터 파일이 없습니다: ${file}"

        root="${file%.json}"
        jq -e --arg root "${root}" \
            'type == "object" and (getpath([$root]) | type == "array")' \
            "${staging_dir}/${file}" >/dev/null \
            || fail "JSON 형식 또는 최상위 배열이 올바르지 않습니다: ${file}"
    done
}

set_data_permissions() {
    chown -R root:poudy "${staging_dir}"
    find "${staging_dir}" -type d -exec chmod 0750 {} +
    find "${staging_dir}" -type f -exec chmod 0640 {} +
}

wait_for_health() {
    local attempt

    for attempt in {1..24}; do
        if curl --fail --silent --show-error --max-time 3 "${HEALTH_URL}" >/dev/null; then
            return 0
        fi
        sleep 5
    done

    return 1
}

restore_previous_data() {
    local previous_dir="${DATA_DIR}.previous"

    systemctl stop "${SERVICE_NAME}" || true
    rm -rf -- "${DATA_DIR}"
    mv -- "${previous_dir}" "${DATA_DIR}"
    systemctl start "${SERVICE_NAME}" || true
}

main() {
    local current_fingerprint previous_fingerprint
    local previous_dir="${DATA_DIR}.previous"
    local service_was_active=0
    local temporary_state_file

    require_root
    require_command aws
    require_command curl
    require_command jq
    require_command sha256sum
    require_command flock
    require_command systemctl
    parse_s3_uri

    install -d -o root -g root -m 0755 "${STATE_DIR}"

    exec 9>"${LOCK_FILE}"
    flock -n 9 || {
        log '이미 실행 중인 동기화 작업이 있어 종료합니다.'
        exit 0
    }

    current_fingerprint="$(calculate_fingerprint)"
    [[ -n "${current_fingerprint}" ]] || fail 'S3 데이터 목록이 비어 있습니다.'
    previous_fingerprint=''
    if [[ -f "${STATE_FILE}" ]]; then
        previous_fingerprint="$(<"${STATE_FILE}")"
    fi

    if [[ "${current_fingerprint}" == "${previous_fingerprint}" ]]; then
        log 'S3 데이터 변경이 없어 종료합니다.'
        exit 0
    fi

    staging_dir="$(mktemp -d "${DATA_DIR}.staging.XXXXXX")"
    cleanup() {
        rm -rf -- "${staging_dir}"
    }
    trap cleanup EXIT

    log "S3 데이터를 staging 디렉터리로 내려받습니다: ${DATA_S3_URI}"
    aws s3 sync "${DATA_S3_URI}" "${staging_dir}" --only-show-errors
    validate_data
    set_data_permissions

    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        service_was_active=1
    fi

    [[ -d "${DATA_DIR}" ]] || fail "기존 데이터 디렉터리가 없습니다: ${DATA_DIR}"
    rm -rf -- "${previous_dir}"
    if [[ "${service_was_active}" -eq 1 ]]; then
        systemctl stop "${SERVICE_NAME}" \
            || fail "백엔드 중지에 실패해 데이터 교체를 취소합니다."
    fi
    mv -- "${DATA_DIR}" "${previous_dir}"
    mv -- "${staging_dir}" "${DATA_DIR}"

    if [[ "${service_was_active}" -eq 1 ]]; then
        log '새 데이터로 백엔드를 재시작합니다.'
        if ! systemctl start "${SERVICE_NAME}" || ! wait_for_health; then
            log '백엔드 health check에 실패해 이전 데이터로 롤백합니다.'
            restore_previous_data
            fail '새 데이터 적용에 실패했습니다.'
        fi
    else
        log '백엔드가 비활성 상태여서 재시작하지 않고 데이터를 교체했습니다.'
    fi

    temporary_state_file="$(mktemp "${STATE_FILE}.XXXXXX")"
    printf '%s\n' "${current_fingerprint}" >"${temporary_state_file}"
    chmod 0640 "${temporary_state_file}"
    chown root:root "${temporary_state_file}"
    mv -- "${temporary_state_file}" "${STATE_FILE}"
    rm -rf -- "${previous_dir}"
    log 'S3 데이터 동기화가 완료됐습니다.'
}

main "$@"
