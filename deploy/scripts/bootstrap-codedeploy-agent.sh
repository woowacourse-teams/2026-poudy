#!/usr/bin/env bash

set -Eeuo pipefail

readonly REGION="${AWS_REGION:-ap-northeast-2}"
readonly AGENT_VERSION="${CODEDEPLOY_AGENT_VERSION:-}"
readonly INSTALLER_URL="https://aws-codedeploy-${REGION}.s3.${REGION}.amazonaws.com/latest/install"

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
    systemctl enable --now codedeploy-agent
    systemctl is-enabled --quiet codedeploy-agent || {
        systemctl status codedeploy-agent --no-pager -l || true
        exit 1
    }
    exit 0
fi

if [[ -n "${AGENT_VERSION}" && ! "${AGENT_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    printf '[poudy-codedeploy] ERROR: CodeDeploy Agent 버전 형식이 올바르지 않습니다: %s\n' "${AGENT_VERSION}" >&2
    exit 1
fi

log "CodeDeploy Agent 설치를 시작합니다. 리전: ${REGION}"
dnf install -y ruby wget

installer_dir="$(mktemp -d -p /var/tmp poudy-codedeploy.XXXXXX)"
installer_path="${installer_dir}/install"
trap 'rm -rf -- "${installer_dir}"' EXIT

wget --https-only --quiet --show-progress "${INSTALLER_URL}" -O "${installer_path}"
chmod 0755 "${installer_path}"
if [[ -n "${AGENT_VERSION}" ]]; then
    log "CodeDeploy Agent 고정 버전을 설치합니다: ${AGENT_VERSION}"
    "${installer_path}" auto -v "releases/codedeploy-agent-${AGENT_VERSION}.noarch.rpm"
else
    log 'CodeDeploy Agent 최신 패키지를 설치합니다.'
    "${installer_path}" auto
fi

systemctl enable --now codedeploy-agent
systemctl is-active --quiet codedeploy-agent || {
    systemctl status codedeploy-agent --no-pager -l || true
    exit 1
}

log 'CodeDeploy Agent 설치 및 실행이 완료됐습니다.'
systemctl is-enabled --quiet codedeploy-agent
