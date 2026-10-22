#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

chown poudy:poudy /opt/poudy/backend/app.jar
chmod 0640 /opt/poudy/backend/app.jar

# 호스트 drop-in으로 설치해 과거 산출물로 롤백해도 CodeDeploy가 제거하지 않게 한다.
install -d -m 0755 /etc/systemd/system/poudy-backend.service.d
install -m 0644 \
    "${SCRIPT_DIR}/20-config-source.conf" \
    /etc/systemd/system/poudy-backend.service.d/20-config-source.conf
