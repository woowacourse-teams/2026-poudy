#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly NGINX_SOURCE_DIR="${SCRIPT_DIR}/../nginx"
readonly ACTIVE_CONFIG="/etc/nginx/conf.d/poudy-frontend.conf"
readonly ACTIVE_MAIN_CONFIG="/etc/nginx/nginx.conf"
readonly CERT_DIR="/etc/letsencrypt/live/poudy.site"

certificate_library="${SCRIPT_DIR}/lib/frontend-certificate.sh"
if [[ ! -f "${certificate_library}" ]]; then
    certificate_library="${SCRIPT_DIR}/../../../scripts/lib/frontend-certificate.sh"
fi
[[ -f "${certificate_library}" ]] || {
    printf '[poudy-frontend-deploy] ERROR: 인증서 검증 라이브러리를 찾을 수 없습니다.\n' >&2
    exit 1
}
# shellcheck source=deploy/scripts/lib/frontend-certificate.sh
source "${certificate_library}"

fail() {
    printf '[poudy-frontend-deploy] ERROR: %s\n' "$*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || fail 'root 권한이 필요합니다.'

if [[ -s "${CERT_DIR}/fullchain.pem" && -s "${CERT_DIR}/privkey.pem" ]]; then
    command -v openssl >/dev/null 2>&1 || fail '인증서 호스트 검증에 필요한 openssl을 찾을 수 없습니다.'
    frontend_certificate_covers_hosts \
        "${CERT_DIR}/fullchain.pem" \
        poudy.site \
        www.poudy.site \
        || fail '기존 인증서가 poudy.site와 www.poudy.site를 모두 포함하지 않습니다. 인증서를 확장한 뒤 다시 배포하세요.'
    source_config="${NGINX_SOURCE_DIR}/ec2-frontend-https.conf"
    selected_mode='HTTPS'
elif [[ -e "${CERT_DIR}/fullchain.pem" || -e "${CERT_DIR}/privkey.pem" ]]; then
    fail '인증서 fullchain.pem과 privkey.pem 중 일부만 존재합니다.'
else
    source_config="${NGINX_SOURCE_DIR}/ec2-frontend.conf"
    selected_mode='HTTP bootstrap'
fi

[[ -f "${source_config}" ]] || fail "Nginx 설정을 찾을 수 없습니다: ${source_config}"
readonly SOURCE_MAIN_CONFIG="${NGINX_SOURCE_DIR}/ec2-nginx.conf"
[[ -f "${SOURCE_MAIN_CONFIG}" ]] || fail "Nginx main 설정을 찾을 수 없습니다: ${SOURCE_MAIN_CONFIG}"

temporary_config="$(mktemp /etc/nginx/conf.d/.poudy-frontend.conf.XXXXXX)"
backup_config="$(mktemp /etc/nginx/conf.d/.poudy-frontend.conf.backup.XXXXXX)"
temporary_main_config="$(mktemp /etc/nginx/.poudy-nginx.conf.XXXXXX)"
backup_main_config="$(mktemp /etc/nginx/.poudy-nginx.conf.backup.XXXXXX)"
had_existing_config=0
had_existing_main_config=0

cleanup() {
    rm -f "${temporary_config}" "${backup_config}" \
        "${temporary_main_config}" "${backup_main_config}"
}

restore_config() {
    if [[ "${had_existing_config}" -eq 1 ]]; then
        install -o root -g root -m 0644 "${backup_config}" "${ACTIVE_CONFIG}"
    else
        rm -f "${ACTIVE_CONFIG}"
    fi

    if [[ "${had_existing_main_config}" -eq 1 ]]; then
        install -o root -g root -m 0644 "${backup_main_config}" "${ACTIVE_MAIN_CONFIG}"
    else
        rm -f "${ACTIVE_MAIN_CONFIG}"
    fi
}

trap cleanup EXIT

if [[ -f "${ACTIVE_CONFIG}" ]]; then
    cp -p "${ACTIVE_CONFIG}" "${backup_config}"
    had_existing_config=1
fi
if [[ -f "${ACTIVE_MAIN_CONFIG}" ]]; then
    cp -p "${ACTIVE_MAIN_CONFIG}" "${backup_main_config}"
    had_existing_main_config=1
fi

install -d -o nginx -g nginx -m 0750 \
    /var/cache/nginx/poudy_categories \
    /var/cache/nginx/poudy_sitemaps \
    /var/cache/nginx/poudy_static

install -o root -g root -m 0644 "${SOURCE_MAIN_CONFIG}" "${temporary_main_config}"
install -o root -g root -m 0644 "${source_config}" "${temporary_config}"
mv -f "${temporary_main_config}" "${ACTIVE_MAIN_CONFIG}"
mv -f "${temporary_config}" "${ACTIVE_CONFIG}"

if ! nginx -t; then
    restore_config
    fail "${selected_mode} Nginx 설정이 유효하지 않아 기존 설정으로 복구했습니다."
fi

printf '[poudy-frontend-deploy] Nginx mode: %s\n' "${selected_mode}"
