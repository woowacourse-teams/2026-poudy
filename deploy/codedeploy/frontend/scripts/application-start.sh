#!/usr/bin/env bash

set -Eeuo pipefail

systemctl daemon-reload
systemctl enable nginx.service poudy-frontend.service
systemctl restart poudy-frontend.service
systemctl restart nginx.service
