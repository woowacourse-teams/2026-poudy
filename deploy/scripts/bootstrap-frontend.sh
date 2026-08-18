#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

# shellcheck source=deploy/scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root

log '프론트엔드 호스트 초기화를 시작합니다.'

dnf install -y nodejs nginx

node_major="$(node --version | sed -n 's/^v\([0-9][0-9]*\).*/\1/p')"
[[ -n "${node_major}" && "${node_major}" -ge 22 ]] || fail "Node.js 22 이상이 필요합니다. 현재 major: ${node_major:-unknown}"

ensure_poudy_user
ensure_config_directory
ensure_directory "${POUDY_ROOT}/frontend" 0750
ensure_environment_file "${POUDY_CONFIG_DIR}/frontend.env"

install_systemd_unit \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-frontend.service" \
    /etc/systemd/system/poudy-frontend.service

install \
    -o root \
    -g root \
    -m 0644 \
    "${REPOSITORY_ROOT}/deploy/nginx/ec2-frontend.conf" \
    /etc/nginx/conf.d/poudy-frontend.conf

if [[ -f /etc/nginx/conf.d/default.conf ]]; then
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
fi

nginx -t
systemctl enable nginx
systemctl start nginx

systemctl daemon-reload
systemctl enable poudy-frontend.service

log '프론트엔드 호스트 초기화가 완료됐습니다. standalone 산출물 배포 후 서비스를 시작하세요.'
systemctl is-enabled poudy-frontend.service
