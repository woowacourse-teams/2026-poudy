#!/usr/bin/env bash

set -Eeuo pipefail

chown poudy:poudy /opt/poudy/backend/app.jar
chmod 0640 /opt/poudy/backend/app.jar
install -d -o poudy -g poudy -m 0750 /opt/poudy/data
