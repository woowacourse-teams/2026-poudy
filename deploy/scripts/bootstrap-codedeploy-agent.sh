#!/usr/bin/env bash

set -Eeuo pipefail

readonly REGION="${AWS_REGION:-ap-northeast-2}"
readonly INSTALLER_URL="https://aws-codedeploy-${REGION}.s3.${REGION}.amazonaws.com/latest/install"
readonly INSTALLER_PATH="/tmp/poudy-codedeploy-install"

require_root() {
    if [[ "${EUID}" -ne 0 ]]; then
        printf '[poudy-codedeploy] ERROR: root 권한으로 실행해야 합니다. sudo를 사용하세요.\n' >&2
        exit 1
    fi
}

log() {
    printf '[poudy-codedeploy] %s\n' "$*"
}

require_root

if systemctl is-active --quiet codedeploy-agent; then
    log 'CodeDeploy Agent가 이미 실행 중입니다.'
    systemctl is-enabled codedeploy-agent || true
    exit 0
fi

log "CodeDeploy Agent 설치를 시작합니다. 리전: ${REGION}"
dnf install -y ruby wget

wget --https-only --quiet --show-progress "${INSTALLER_URL}" -O "${INSTALLER_PATH}"
chmod 0755 "${INSTALLER_PATH}"
"${INSTALLER_PATH}" auto
rm -f "${INSTALLER_PATH}"

systemctl enable --now codedeploy-agent
systemctl is-active --quiet codedeploy-agent || {
    systemctl status codedeploy-agent --no-pager -l || true
    exit 1
}

log 'CodeDeploy Agent 설치 및 실행이 완료됐습니다.'
systemctl is-enabled codedeploy-agent
