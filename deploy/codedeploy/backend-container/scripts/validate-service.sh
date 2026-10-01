#!/usr/bin/env bash

set -Eeuo pipefail

for attempt in {1..24}; do
    if systemctl is-active --quiet poudy-backend.service \
        && docker inspect --format '{{.State.Running}}' poudy-backend 2>/dev/null \
            | grep -qx true \
        && curl --fail --silent --show-error --max-time 3 \
            http://127.0.0.1:8081/actuator/health >/dev/null; then
        # The loaded image is now runnable; the CodeDeploy artifact in S3 is
        # the rollback source, so remove the duplicate compressed archive.
        rm -f /opt/poudy/backend/image.tar.gz
        exit 0
    fi
    sleep 5
done

echo "container backend health check failed" >&2
systemctl status poudy-backend.service --no-pager -l >&2 || true
docker logs --tail 80 poudy-backend >&2 || true
journalctl -u poudy-backend.service --no-pager -n 80 >&2 || true
exit 1
