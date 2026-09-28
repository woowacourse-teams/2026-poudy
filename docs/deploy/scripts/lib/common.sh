#!/usr/bin/env bash

set -Eeuo pipefail

readonly POUDY_USER="poudy"
readonly POUDY_GROUP="poudy"
readonly POUDY_ROOT="/opt/poudy"
readonly POUDY_CONFIG_DIR="/etc/poudy"

log() {
    printf '[poudy-bootstrap] %s\n' "$*"
}

fail() {
    printf '[poudy-bootstrap] ERROR: %s\n' "$*" >&2
    exit 1
}

require_root() {
    if [[ "${EUID}" -ne 0 ]]; then
        fail 'root 권한으로 실행해야 합니다. sudo를 사용하세요.'
    fi
}

ensure_poudy_user() {
    if ! getent group "${POUDY_GROUP}" >/dev/null 2>&1; then
        groupadd --system "${POUDY_GROUP}"
        log "${POUDY_GROUP} 그룹을 생성했습니다."
    fi

    if ! id -u "${POUDY_USER}" >/dev/null 2>&1; then
        useradd \
            --system \
            --gid "${POUDY_GROUP}" \
            --home-dir "${POUDY_ROOT}" \
            --shell /sbin/nologin \
            "${POUDY_USER}"
        log "${POUDY_USER} 사용자를 생성했습니다."
    fi
}

ensure_directory() {
    local path="$1"
    local mode="$2"

    install -d -o "${POUDY_USER}" -g "${POUDY_GROUP}" -m "${mode}" "${path}"
}

ensure_config_directory() {
    install -d -o root -g "${POUDY_GROUP}" -m 0750 "${POUDY_CONFIG_DIR}"
}

ensure_environment_file() {
    local path="$1"

    if [[ ! -e "${path}" ]]; then
        install -o root -g "${POUDY_GROUP}" -m 0640 /dev/null "${path}"
        log "환경 변수 파일을 생성했습니다: ${path}"
    fi
}

install_systemd_unit() {
    local source="$1"
    local target="$2"

    [[ -f "${source}" ]] || fail "systemd 서비스 파일을 찾을 수 없습니다: ${source}"
    install -o root -g root -m 0644 "${source}" "${target}"
}
