#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

# shellcheck source=deploy/scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root

log '백엔드 호스트 초기화를 시작합니다.'

dnf install -y \
    awscli-2 \
    curl-minimal \
    java-21-amazon-corretto-headless \
    jq \
    libde265 \
    libheif-tools \
    postgresql15 \
    util-linux-core

java_major="$(java -version 2>&1 | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -n 1)"
[[ "${java_major}" == '21' ]] || fail "Java 21을 확인하지 못했습니다. 현재 major: ${java_major:-unknown}"
[[ -x /usr/bin/prlimit ]] || fail '/usr/bin/prlimit을 확인하지 못했습니다.'
[[ -x /usr/bin/heif-convert ]] || fail '/usr/bin/heif-convert를 확인하지 못했습니다.'
command -v psql >/dev/null 2>&1 || fail 'psql을 확인하지 못했습니다.'

ensure_poudy_user
ensure_config_directory
ensure_directory "${POUDY_ROOT}/backend" 0750
if [[ ! -e "${POUDY_CONFIG_DIR}/backend.env" ]]; then
    install \
        -o root \
        -g "${POUDY_GROUP}" \
        -m 0640 \
        "${REPOSITORY_ROOT}/deploy/config/backend.env.example" \
        "${POUDY_CONFIG_DIR}/backend.env"
fi

install_systemd_unit \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-backend.service" \
    /etc/systemd/system/poudy-backend.service

chown -R "${POUDY_USER}:${POUDY_GROUP}" "${POUDY_ROOT}/backend"

systemctl daemon-reload
systemctl enable poudy-backend.service
systemctl disable --now poudy-data-sync.timer >/dev/null 2>&1 || true

log '백엔드 호스트 초기화가 완료됐습니다. app.jar 배포 후 서비스를 시작하세요.'
systemctl is-enabled poudy-backend.service
