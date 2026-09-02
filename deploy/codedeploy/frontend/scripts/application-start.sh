#!/usr/bin/env bash

set -Eeuo pipefail

systemctl daemon-reload
systemctl enable nginx.service poudy-frontend.service
"$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/reconcile-nginx.sh"
systemctl restart nginx.service
systemctl restart poudy-frontend.service
