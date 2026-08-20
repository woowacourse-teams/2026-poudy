#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
readonly NODE_VERSION="22.22.1"
readonly NODE_ARCHIVE="node-v${NODE_VERSION}-linux-arm64.tar.xz"
readonly NODE_DIST_BASE="https://nodejs.org/dist/v${NODE_VERSION}"

# shellcheck source=deploy/scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root

log '프론트엔드 호스트 초기화를 시작합니다.'

dnf install -y curl-minimal nginx xz

node_install_dir="/opt/node-v${NODE_VERSION}-linux-arm64"
if [[ ! -x "${node_install_dir}/bin/node" ]]; then
    temporary_dir="$(mktemp -d)"
    trap 'rm -rf "${temporary_dir}"' EXIT

    log "Node.js ${NODE_VERSION} ARM64 런타임을 설치합니다."
    curl --fail --silent --show-error --location \
        "${NODE_DIST_BASE}/${NODE_ARCHIVE}" \
        --output "${temporary_dir}/${NODE_ARCHIVE}"
    curl --fail --silent --show-error --location \
        "${NODE_DIST_BASE}/SHASUMS256.txt" \
        --output "${temporary_dir}/SHASUMS256.txt"

    (
        cd "${temporary_dir}"
        grep "  ${NODE_ARCHIVE}$" SHASUMS256.txt | sha256sum --check --status
    ) || fail 'Node.js 배포 파일의 SHA-256 검증에 실패했습니다.'

    install -d -o root -g root -m 0755 /opt
    tar -xJf "${temporary_dir}/${NODE_ARCHIVE}" -C /opt
fi

ln -sfn "${node_install_dir}" /opt/node
node_bin="/opt/node/bin/node"
node_major="$("${node_bin}" --version | sed -n 's/^v\([0-9][0-9]*\).*/\1/p')"
[[ -n "${node_major}" && "${node_major}" -ge 22 ]] || fail "Node.js 22 이상을 확인하지 못했습니다. 현재 major: ${node_major:-unknown}"

ensure_poudy_user
ensure_config_directory
ensure_directory "${POUDY_ROOT}/frontend" 0750
install -d -o root -g root -m 0755 /var/www/letsencrypt
ensure_environment_file "${POUDY_CONFIG_DIR}/frontend.env"

install_systemd_unit \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-frontend.service" \
    /etc/systemd/system/poudy-frontend.service

if [[ ! -e /etc/nginx/nginx.conf.poudy-default ]]; then
    mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.poudy-default
fi

install \
    -o root \
    -g root \
    -m 0644 \
    "${REPOSITORY_ROOT}/deploy/nginx/ec2-nginx.conf" \
    /etc/nginx/nginx.conf

install \
    -o root \
    -g root \
    -m 0644 \
    "${REPOSITORY_ROOT}/deploy/nginx/ec2-frontend.conf" \
    /etc/nginx/conf.d/poudy-frontend.conf

# Certbot이 아직 인증서를 발급하지 않은 초기 상태에서는 HTTP 설정을
# 유지합니다. 이미 인증서가 있는 호스트를 재초기화하는 경우에만 HTTPS
# 설정을 활성화하며, 인증서가 없을 때는 절대 인증서 경로를 nginx에 넣지
# 않습니다.
if [[ -s /etc/letsencrypt/live/poudy.site/fullchain.pem \
    && -s /etc/letsencrypt/live/poudy.site/privkey.pem ]]; then
    install \
        -o root \
        -g root \
        -m 0644 \
        "${REPOSITORY_ROOT}/deploy/nginx/ec2-frontend-https.conf" \
        /etc/nginx/conf.d/poudy-frontend.conf
fi

install \
    -o root \
    -g root \
    -m 0644 \
    "${REPOSITORY_ROOT}/deploy/nginx/poudy-backend-upstream.conf" \
    /etc/nginx/conf.d/poudy-backend-upstream.conf

if [[ -f /etc/nginx/conf.d/default.conf ]]; then
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
fi

nginx -t
systemctl enable nginx
systemctl restart nginx

systemctl daemon-reload
systemctl enable poudy-frontend.service

log '프론트엔드 호스트 초기화가 완료됐습니다. standalone 산출물 배포 후 서비스를 시작하세요.'
systemctl is-enabled poudy-frontend.service
