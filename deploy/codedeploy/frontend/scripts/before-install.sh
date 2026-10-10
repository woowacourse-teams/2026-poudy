#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SITE_FILE="${SCRIPT_DIR}/../nginx/frontend-site.env"

fail() {
    printf '[poudy-frontend-deploy] ERROR: %s\n' "$*" >&2
    exit 1
}

library_path() {
    local name="$1"

    if [[ -f "${SCRIPT_DIR}/lib/${name}" ]]; then
        printf '%s' "${SCRIPT_DIR}/lib/${name}"
    elif [[ -f "${SCRIPT_DIR}/../../../scripts/lib/${name}" ]]; then
        printf '%s' "${SCRIPT_DIR}/../../../scripts/lib/${name}"
    else
        fail "배포 라이브러리를 찾을 수 없습니다: ${name}"
    fi
}

# shellcheck source=deploy/scripts/lib/frontend-certificate.sh
source "$(library_path frontend-certificate.sh)"
# shellcheck source=deploy/scripts/lib/frontend-site.sh
source "$(library_path frontend-site.sh)"

load_frontend_site "${SITE_FILE}" || fail "프론트 도메인 설정이 없거나 형식이 맞지 않습니다: ${SITE_FILE}"
readonly CERT_DIR="$(frontend_site_cert_dir)"

# 호스트의 인증서가 대표 도메인과 별칭을 모두 포함하지 않으면 서비스를 중지하기
# 전에 배포를 거부합니다. 운영자는 먼저 같은 Certbot lineage에 SAN을 추가해야 합니다.
if [[ -s "${CERT_DIR}/fullchain.pem" && -s "${CERT_DIR}/privkey.pem" ]]; then
    command -v openssl >/dev/null 2>&1 || fail '인증서 호스트 검증에 필요한 openssl을 찾을 수 없습니다.'
    # shellcheck disable=SC2086
    frontend_certificate_covers_hosts \
        "${CERT_DIR}/fullchain.pem" \
        "${POUDY_SITE_HOST}" \
        ${POUDY_SITE_ALIASES} \
        || fail "기존 인증서가 ${POUDY_SITE_HOST}${POUDY_SITE_ALIASES:+ ${POUDY_SITE_ALIASES}}를 모두 포함하지 않습니다. 인증서를 확장한 뒤 다시 배포하세요."
elif [[ -e "${CERT_DIR}/fullchain.pem" || -e "${CERT_DIR}/privkey.pem" ]]; then
    fail '인증서 fullchain.pem과 privkey.pem 중 일부만 존재합니다.'
fi

systemctl stop poudy-frontend.service || true
install -d -o poudy -g poudy -m 0750 /opt/poudy/frontend
