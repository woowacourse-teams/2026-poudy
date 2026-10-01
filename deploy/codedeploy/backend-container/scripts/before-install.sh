#!/usr/bin/env bash

set -Eeuo pipefail

bash "$(dirname "$0")/validate-database.sh" \
    || { printf '[poudy-deploy] ERROR: DB 및 환경 설정 검증 실패. 기존 서비스를 유지합니다.\n' >&2; exit 1; }

# Retire legacy JSON synchronization units that may remain from earlier deployments.
if systemctl cat poudy-data-sync.timer >/dev/null 2>&1; then
    systemctl disable --now poudy-data-sync.timer \
        || { printf '[poudy-deploy] ERROR: JSON 동기화 타이머 중지 실패\n' >&2; exit 1; }
fi
if systemctl cat poudy-data-sync.service >/dev/null 2>&1; then
    systemctl stop poudy-data-sync.service \
        || { printf '[poudy-deploy] ERROR: 실행 중인 JSON 동기화 서비스 중지 실패\n' >&2; exit 1; }
fi

if ! command -v docker >/dev/null 2>&1; then
    dnf install -y docker
fi

systemctl enable --now docker.service
docker info >/dev/null

install -d -o poudy -g poudy -m 0750 /opt/poudy/backend
install -d -o root -g poudy -m 0750 /etc/poudy
