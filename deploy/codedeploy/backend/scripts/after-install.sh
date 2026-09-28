#!/usr/bin/env bash

set -Eeuo pipefail

chown poudy:poudy /opt/poudy/backend/app.jar
chmod 0640 /opt/poudy/backend/app.jar
