#!/usr/bin/env bash

set -Eeuo pipefail

for attempt in {1..24}; do
    if curl --fail --silent --show-error --max-time 3 \
        http://127.0.0.1:8080/actuator/health >/dev/null; then
        exit 0
    fi
    sleep 5
done

echo "backend health check failed" >&2
systemctl status poudy-backend.service --no-pager -l >&2 || true
journalctl -u poudy-backend.service --no-pager -n 80 >&2 || true
exit 1
