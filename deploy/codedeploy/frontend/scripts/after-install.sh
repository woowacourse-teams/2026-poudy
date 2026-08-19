#!/usr/bin/env bash

set -Eeuo pipefail

chown -R poudy:poudy /opt/poudy/frontend
find /opt/poudy/frontend -type d -exec chmod 0750 {} +
find /opt/poudy/frontend -type f -exec chmod 0640 {} +
chmod 0750 /opt/poudy/frontend/server.js
