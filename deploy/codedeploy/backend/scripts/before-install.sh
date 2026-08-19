#!/usr/bin/env bash

set -Eeuo pipefail

systemctl stop poudy-backend.service || true
install -d -o poudy -g poudy -m 0750 /opt/poudy/backend
