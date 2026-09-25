#!/usr/bin/env bash

set -Eeuo pipefail

bash "$(dirname "$0")/validate-database.sh" \
    || { printf '[poudy-deploy] ERROR: DB 및 환경 설정 검증 실패. 기존 서비스를 유지합니다.\n' >&2; exit 1; }

# 이전 배포의 JSON 동기화 unit은 새 artifact에서 제거해도 EC2에 남을 수 있다.
if systemctl cat poudy-data-sync.timer >/dev/null 2>&1; then
    printf '[poudy-deploy] 기존 JSON 동기화 타이머를 비활성화합니다.\n'
    systemctl disable --now poudy-data-sync.timer \
        || { printf '[poudy-deploy] ERROR: JSON 동기화 타이머 중지 실패\n' >&2; exit 1; }
fi
if systemctl cat poudy-data-sync.service >/dev/null 2>&1; then
    systemctl stop poudy-data-sync.service \
        || { printf '[poudy-deploy] ERROR: 실행 중인 JSON 동기화 서비스 중지 실패\n' >&2; exit 1; }
fi

if systemctl cat poudy-backend.service >/dev/null 2>&1; then
    systemctl stop poudy-backend.service \
        || { printf '[poudy-deploy] ERROR: 기존 백엔드 서비스 중지 실패\n' >&2; exit 1; }
fi
install -d -o poudy -g poudy -m 0750 /opt/poudy/backend
