#!/usr/bin/env bash

set -Eeuo pipefail

systemctl daemon-reload
systemctl enable poudy-backend.service
systemctl restart poudy-backend.service
