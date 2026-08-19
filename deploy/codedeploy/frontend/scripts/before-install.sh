#!/usr/bin/env bash

set -Eeuo pipefail

systemctl stop poudy-frontend.service || true
install -d -o poudy -g poudy -m 0750 /opt/poudy/frontend
