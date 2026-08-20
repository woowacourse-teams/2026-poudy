#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly NGINX_SOURCE_DIR="${SCRIPT_DIR}/../nginx"
readonly ACTIVE_CONFIG="/etc/nginx/conf.d/poudy-frontend.conf"
readonly CERT_DIR="/etc/letsencrypt/live/poudy.site"

fail() {
    printf '[poudy-frontend-deploy] ERROR: %s\n' "$*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || fail 'root 권한이 필요합니다.'

if [[ -s "${CERT_DIR}/fullchain.pem" && -s "${CERT_DIR}/privkey.pem" ]]; then
    source_config="${NGINX_SOURCE_DIR}/ec2-frontend-https.conf"
    selected_mode='HTTPS'
else
    source_config="${NGINX_SOURCE_DIR}/ec2-frontend.conf"
    selected_mode='HTTP bootstrap'
fi

[[ -f "${source_config}" ]] || fail "Nginx 설정을 찾을 수 없습니다: ${source_config}"

temporary_config="$(mktemp /etc/nginx/conf.d/.poudy-frontend.conf.XXXXXX)"
backup_config="$(mktemp /etc/nginx/conf.d/.poudy-frontend.conf.backup.XXXXXX)"
had_existing_config=0

cleanup() {
    rm -f "${temporary_config}" "${backup_config}"
}

restore_config() {
    if [[ "${had_existing_config}" -eq 1 ]]; then
        install -o root -g root -m 0644 "${backup_config}" "${ACTIVE_CONFIG}"
    else
        rm -f "${ACTIVE_CONFIG}"
    fi
}

trap cleanup EXIT

if [[ -f "${ACTIVE_CONFIG}" ]]; then
    cp -p "${ACTIVE_CONFIG}" "${backup_config}"
    had_existing_config=1
fi

install -o root -g root -m 0644 "${source_config}" "${temporary_config}"
mv -f "${temporary_config}" "${ACTIVE_CONFIG}"

if ! nginx -t; then
    restore_config
    fail "${selected_mode} Nginx 설정이 유효하지 않아 기존 설정으로 복구했습니다."
fi

printf '[poudy-frontend-deploy] Nginx mode: %s\n' "${selected_mode}"
