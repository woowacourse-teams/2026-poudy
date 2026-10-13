#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
    printf 'root 권한으로 실행해야 합니다. sudo를 사용하세요.\n' >&2
    exit 1
fi

metadata_token="$(curl -fsS -X PUT \
    -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
    http://169.254.169.254/latest/api/token)"
instance_id="$(curl -fsS \
    -H "X-aws-ec2-metadata-token: ${metadata_token}" \
    http://169.254.169.254/latest/meta-data/instance-id)"
if [[ "${instance_id}" != 'i-0192ed4a2f51748fe' ]]; then
    printf 'production backend 전용 스크립트입니다. 현재 instance-id: %s\n' "${instance_id}" >&2
    exit 1
fi

dnf install -y nftables

install -d -o root -g poudy -m 0750 /etc/poudy
install -o root -g root -m 0644 \
    "${REPOSITORY_ROOT}/deploy/firewall/production-backend.nft" \
    /etc/poudy/backend-firewall.nft
install -o root -g root -m 0644 \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-backend-firewall.service" \
    /etc/systemd/system/poudy-backend-firewall.service
install -d -o root -g root -m 0755 /etc/systemd/system/poudy-backend.service.d
install -o root -g root -m 0644 \
    "${REPOSITORY_ROOT}/deploy/systemd/poudy-backend.service.d/10-firewall.conf" \
    /etc/systemd/system/poudy-backend.service.d/10-firewall.conf

nft -c -f /etc/poudy/backend-firewall.nft
systemctl daemon-reload
systemctl enable poudy-backend-firewall.service
systemctl restart poudy-backend-firewall.service

printf 'Installed production backend firewall from repository revision %s\n' \
    "$(git -C "${REPOSITORY_ROOT}" rev-parse --short HEAD 2>/dev/null || printf unknown)"
systemctl is-enabled poudy-backend-firewall.service
systemctl is-active poudy-backend-firewall.service
systemctl is-active poudy-backend.service
nft list table inet poudy_backend
