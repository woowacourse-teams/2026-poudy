#!/usr/bin/env bash

set -Eeuo pipefail

for attempt in {1..24}; do
    if curl --fail --silent --show-error --max-time 3 \
        http://127.0.0.1:8080/actuator/health >/dev/null; then
        exit 0
    fi
    sleep 5
done

health_status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 \
    http://127.0.0.1:8080/actuator/health)" || health_status='connection failure'
printf '[poudy-deploy] ERROR: 백엔드 health check 실패 (마지막 상태: %s). 최근 서비스 로그:\n' "${health_status}" >&2
systemctl status poudy-backend.service --no-pager -l >&2 || true
journalctl -u poudy-backend.service --no-pager -n 80 >&2 || true
exit 1
