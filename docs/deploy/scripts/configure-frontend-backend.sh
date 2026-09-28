#!/usr/bin/env bash

set -Eeuo pipefail

readonly CONFIG_PATH="/etc/nginx/conf.d/poudy-backend-upstream.conf"

log() {
    printf '[poudy-frontend] %s\n' "$*"
}

fail() {
    printf '[poudy-frontend] ERROR: %s\n' "$*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || fail 'root 권한으로 실행해야 합니다. sudo를 사용하세요.'

backend_host="${1:-}"
[[ -n "${backend_host}" ]] || fail "사용법: $0 <백엔드 사설 IP 또는 내부 DNS 이름>"
[[ "${backend_host}" =~ ^[A-Za-z0-9.-]+$ ]] || fail '백엔드 호스트에는 IP 주소 또는 내부 DNS 이름만 사용할 수 있습니다.'

temporary_file="$(mktemp)"
backup_file="$(mktemp)"
had_existing_config=0

if [[ -f "${CONFIG_PATH}" ]]; then
    cp -p "${CONFIG_PATH}" "${backup_file}"
    had_existing_config=1
fi

cleanup() {
    rm -f "${temporary_file}" "${backup_file}"
}

restore_config() {
    if [[ "${had_existing_config}" -eq 1 ]]; then
        install -o root -g root -m 0644 "${backup_file}" "${CONFIG_PATH}"
    else
        rm -f "${CONFIG_PATH}"
    fi
}

trap cleanup EXIT

cat >"${temporary_file}" <<EOF
upstream poudy_backend {
    server ${backend_host}:8080;
}
EOF

install -o root -g root -m 0644 "${temporary_file}" "${CONFIG_PATH}"
if ! nginx -t; then
    restore_config
    fail '새 Nginx 설정이 유효하지 않아 기존 설정으로 복구했습니다.'
fi

if ! systemctl reload nginx; then
    restore_config
    nginx -t >/dev/null 2>&1 || true
    fail 'Nginx reload에 실패해 기존 설정으로 복구했습니다.'
fi

log "백엔드 프록시 대상을 ${backend_host}:8080으로 변경했습니다."
