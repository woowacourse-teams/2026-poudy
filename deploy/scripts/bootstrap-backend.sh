#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

# shellcheck source=deploy/scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root

log '백엔드 호스트 초기화를 시작합니다.'

dnf install -y awscli-2 curl-minimal java-21-amazon-corretto-headless jq

java_major="$(java -version 2>&1 | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -n 1)"
[[ "${java_major}" == '21' ]] || fail "Java 21을 확인하지 못했습니다. 현재 major: ${java_major:-unknown}"

ensure_poudy_user
ensure_config_directory
ensure_directory "${POUDY_ROOT}/backend" 0750
ensure_directory "${POUDY_ROOT}/data" 0750
install -d -o root -g root -m 0755 /var/lib/poudy/backend-data
ensure_environment_file "${POUDY_CONFIG_DIR}/backend.env"

if [[ ! -e "${POUDY_CONFIG_DIR}/backend-data.env" ]]; then
    install \
        -o root \
        -g "${POUDY_GROUP}" \
        -m 0640 \
        "${REPOSITORY_ROOT}/deploy/config/backend-data.env" \
        "${POUDY_CONFIG_DIR}/backend-data.env"
fi

install_systemd_unit \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-backend.service" \
    /etc/systemd/system/poudy-backend.service

install \
    -o root \
    -g root \
    -m 0750 \
    "${REPOSITORY_ROOT}/deploy/scripts/sync-backend-data.sh" \
    /usr/local/sbin/poudy-sync-backend-data

install_systemd_unit \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-data-sync.service" \
    /etc/systemd/system/poudy-data-sync.service

install_systemd_unit \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-data-sync.timer" \
    /etc/systemd/system/poudy-data-sync.timer

chown -R "${POUDY_USER}:${POUDY_GROUP}" "${POUDY_ROOT}/backend"
chown -R root:"${POUDY_GROUP}" "${POUDY_ROOT}/data"
find "${POUDY_ROOT}/data" -type d -exec chmod 0750 {} +
find "${POUDY_ROOT}/data" -type f -exec chmod 0640 {} +

systemctl daemon-reload
systemctl enable poudy-backend.service
systemctl enable poudy-data-sync.timer

log '백엔드 호스트 초기화가 완료됐습니다. app.jar 배포 후 서비스를 시작하세요.'
systemctl is-enabled poudy-backend.service
