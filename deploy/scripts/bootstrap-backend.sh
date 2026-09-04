#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

# shellcheck source=deploy/scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root

log '백엔드 호스트 초기화를 시작합니다.'

dnf install -y \
    curl-minimal \
    java-21-amazon-corretto-headless \
    libde265 \
    libheif-tools \
    util-linux-core

java_major="$(java -version 2>&1 | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -n 1)"
[[ "${java_major}" == '21' ]] || fail "Java 21을 확인하지 못했습니다. 현재 major: ${java_major:-unknown}"
[[ -x /usr/bin/prlimit ]] || fail '/usr/bin/prlimit을 확인하지 못했습니다.'
[[ -x /usr/bin/heif-convert ]] || fail '/usr/bin/heif-convert를 확인하지 못했습니다.'

ensure_poudy_user
ensure_config_directory
ensure_directory "${POUDY_ROOT}/backend" 0750
ensure_directory "${POUDY_ROOT}/data" 0750
ensure_environment_file "${POUDY_CONFIG_DIR}/backend.env"

install_systemd_unit \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-backend.service" \
    /etc/systemd/system/poudy-backend.service

chown -R "${POUDY_USER}:${POUDY_GROUP}" "${POUDY_ROOT}/backend"
chown -R root:"${POUDY_GROUP}" "${POUDY_ROOT}/data"
find "${POUDY_ROOT}/data" -type d -exec chmod 0750 {} +
find "${POUDY_ROOT}/data" -type f -exec chmod 0640 {} +

systemctl daemon-reload
systemctl enable poudy-backend.service

log '백엔드 호스트 초기화가 완료됐습니다. app.jar 배포 후 서비스를 시작하세요.'
systemctl is-enabled poudy-backend.service
