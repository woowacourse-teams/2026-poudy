#!/usr/bin/env bash

set -Eeuo pipefail

systemctl daemon-reload
systemctl enable poudy-backend.service
if ! systemctl restart poudy-backend.service; then
    printf '[poudy-deploy] ERROR: 백엔드 서비스 시작 실패. 최근 서비스 로그:\n' >&2
    systemctl status poudy-backend.service --no-pager -l >&2 || true
    journalctl -u poudy-backend.service --no-pager -n 80 >&2 || true
    exit 1
fi
