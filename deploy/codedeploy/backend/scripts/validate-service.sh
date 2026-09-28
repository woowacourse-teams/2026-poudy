#!/usr/bin/env bash

set -Eeuo pipefail

readonly HEALTH_URL='http://127.0.0.1:8081/actuator/health'

for attempt in {1..24}; do
    if curl --fail --silent --show-error --max-time 3 \
        "${HEALTH_URL}" >/dev/null; then
        exit 0
    fi
    sleep 5
done

health_status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 \
    "${HEALTH_URL}")" || health_status='connection failure'
printf '[poudy-deploy] ERROR: 백엔드 health check 실패 (마지막 상태: %s). 최근 서비스 로그:\n' "${health_status}" >&2
systemctl status poudy-backend.service --no-pager -l >&2 || true
journalctl -u poudy-backend.service --no-pager -n 80 >&2 || true
exit 1
