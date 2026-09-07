#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
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

# 호스트가 apex 전용 인증서를 사용하는 경우 서비스를 중지하기 전에 배포를
# 거부합니다. 운영자는 먼저 같은 Certbot lineage에 www SAN을 추가해야 합니다.
if [[ -s "${CERT_DIR}/fullchain.pem" && -s "${CERT_DIR}/privkey.pem" ]]; then
    command -v openssl >/dev/null 2>&1 || fail '인증서 호스트 검증에 필요한 openssl을 찾을 수 없습니다.'
    frontend_certificate_covers_hosts \
        "${CERT_DIR}/fullchain.pem" \
        poudy.site \
        www.poudy.site \
        || fail '기존 인증서가 poudy.site와 www.poudy.site를 모두 포함하지 않습니다. 인증서를 확장한 뒤 다시 배포하세요.'
elif [[ -e "${CERT_DIR}/fullchain.pem" || -e "${CERT_DIR}/privkey.pem" ]]; then
    fail '인증서 fullchain.pem과 privkey.pem 중 일부만 존재합니다.'
fi

systemctl stop poudy-frontend.service || true
install -d -o poudy -g poudy -m 0750 /opt/poudy/frontend
