#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
readonly ACTIVE_CONFIG="/etc/nginx/conf.d/poudy-frontend.conf"

# shellcheck source=deploy/scripts/lib/frontend-certificate.sh
source "${SCRIPT_DIR}/lib/frontend-certificate.sh"
# shellcheck source=deploy/scripts/lib/frontend-site.sh
source "${SCRIPT_DIR}/lib/frontend-site.sh"

log() {
    printf '[poudy-frontend-ssl] %s\n' "$*"
}

fail() {
    printf '[poudy-frontend-ssl] ERROR: %s\n' "$*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || fail 'root 권한으로 실행해야 합니다. sudo를 사용하세요.'

# 인자 없이 등록된 기존 certbot renew --deploy-hook 이 운영 설정을 그대로 쓰도록
# 기본값은 production 이다. staging 호스트에는 운영 인증서가 없어 잘못 불려도 실패한다.
environment_name="${1:-production}"
[[ "${environment_name}" =~ ^(production|staging)$ ]] || fail "사용법: $0 [production|staging]"
site_file="${REPOSITORY_ROOT}/deploy/config/frontend-site-${environment_name}.env"
load_frontend_site "${site_file}" || fail "프론트 도메인 설정이 없거나 형식이 맞지 않습니다: ${site_file}"
readonly CERT_DIR="$(frontend_site_cert_dir)"

[[ -s "${CERT_DIR}/fullchain.pem" && -s "${CERT_DIR}/privkey.pem" ]] \
    || fail "인증서를 찾을 수 없습니다: ${CERT_DIR}"
command -v openssl >/dev/null 2>&1 || fail '인증서 호스트 검증에 필요한 openssl을 찾을 수 없습니다.'
# shellcheck disable=SC2086
frontend_certificate_covers_hosts \
    "${CERT_DIR}/fullchain.pem" \
    "${POUDY_SITE_HOST}" \
    ${POUDY_SITE_ALIASES} \
    || fail "인증서가 ${POUDY_SITE_HOST}${POUDY_SITE_ALIASES:+ ${POUDY_SITE_ALIASES}}를 모두 포함하지 않습니다. 먼저 기존 인증서를 확장하세요."

source_config="${REPOSITORY_ROOT}/deploy/nginx/ec2-frontend-https.conf"
[[ -f "${source_config}" ]] || fail "HTTPS Nginx 설정을 찾을 수 없습니다: ${source_config}"

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

render_frontend_nginx_config "${source_config}" "${temporary_config}" \
    || fail "Nginx 설정에 채우지 못한 도메인 자리표시자가 남았습니다: ${source_config}"
chown root:root "${temporary_config}"
chmod 0644 "${temporary_config}"
mv -f "${temporary_config}" "${ACTIVE_CONFIG}"

if ! nginx -t; then
    restore_config
    fail 'HTTPS Nginx 설정이 유효하지 않아 기존 설정으로 복구했습니다.'
fi

if systemctl is-active --quiet nginx.service; then
    if ! systemctl reload nginx.service; then
        restore_config
        nginx -t >/dev/null 2>&1 || true
        fail 'Nginx reload에 실패해 기존 설정으로 복구했습니다.'
    fi
fi

log "${POUDY_SITE_HOST} HTTPS와 별칭 도메인 리디렉션을 활성화했습니다."
