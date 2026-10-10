#!/usr/bin/env bash

set -Eeuo pipefail

: "${POUDY_BACKEND_IMAGE:?POUDY_BACKEND_IMAGE is required}"

exec /usr/bin/docker run \
    --rm \
    --init \
    --name poudy-backend \
    --network host \
    --user "$(id -u poudy):$(id -g poudy)" \
    --memory 1g \
    --memory-swap 1g \
    --cpus 1 \
    --pids-limit 256 \
    --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    --volume /var/lib/poudy-sessions:/var/lib/poudy-sessions \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --log-driver journald \
    --log-opt tag=poudy-backend \
    --env-file /etc/poudy/backend.env \
    --env SPRING_PROFILES_ACTIVE=prod \
    --env SERVER_PORT=8080 \
    --env POUDY_SESSION_STORE_DIR=/var/lib/poudy-sessions \
    "${POUDY_BACKEND_IMAGE}"
