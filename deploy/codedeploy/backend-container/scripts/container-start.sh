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
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --log-driver journald \
    --log-opt tag=poudy-backend \
    --env-file /etc/poudy/backend.env \
    --env SPRING_PROFILES_ACTIVE=prod,staging \
    --env SERVER_PORT=8080 \
    "${POUDY_BACKEND_IMAGE}"
