#!/usr/bin/env bash

set -Eeuo pipefail

for attempt in {1..24}; do
    if curl --fail --silent --show-error --max-time 3 \
        http://127.0.0.1/nginx-health >/dev/null \
        && curl --fail --silent --show-error --max-time 3 \
        http://127.0.0.1/ >/dev/null; then
        exit 0
    fi
    sleep 5
done

echo "frontend health check failed" >&2
systemctl status poudy-frontend.service nginx.service --no-pager -l >&2 || true
journalctl -u poudy-frontend.service -u nginx.service --no-pager -n 80 >&2 || true
exit 1
