#!/usr/bin/env bash

set -Eeuo pipefail

chown -R poudy:poudy /opt/poudy/frontend
find /opt/poudy/frontend -type d -exec chmod 0750 {} +
find /opt/poudy/frontend -type f -exec chmod 0640 {} +
chmod 0750 /opt/poudy/frontend/server.js

# Storybook 은 Nginx(nginx 사용자)가 직접 읽는 정적 파일이다. 앱 파일과 달리 누구나 읽게 둔다.
if [[ -d /var/www/poudy-storybook ]]; then
    chown -R root:root /var/www/poudy-storybook
    find /var/www/poudy-storybook -type d -exec chmod 0755 {} +
    find /var/www/poudy-storybook -type f -exec chmod 0644 {} +
fi
