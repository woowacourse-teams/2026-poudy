#!/usr/bin/env bash

set -Eeuo pipefail

[[ "${EUID}" -eq 0 ]] || { echo 'root 권한이 필요합니다.' >&2; exit 1; }
readonly SWAP_FILE=/swapfile
readonly MINIMUM_BYTES=536870912

[[ ! -L "${SWAP_FILE}" ]] || { echo '/swapfile은 심볼릭 링크일 수 없습니다.' >&2; exit 1; }

# 기존 파일을 덮어쓰거나 활성 swap을 resize하지 않는다.
if [[ ! -e "${SWAP_FILE}" ]]; then
    (umask 077; dd if=/dev/zero of="${SWAP_FILE}" bs=1M count=512 status=none)
    mkswap "${SWAP_FILE}"
fi
[[ -f "${SWAP_FILE}" && ! -L "${SWAP_FILE}" ]] \
    || { echo '/swapfile은 일반 파일이어야 합니다.' >&2; exit 1; }
[[ "$(stat -c %s "${SWAP_FILE}")" -ge "${MINIMUM_BYTES}" ]] \
    || { echo '기존 /swapfile이 512MiB보다 작습니다. 수동 점검이 필요합니다.' >&2; exit 1; }
[[ "$(blkid -p -s TYPE -o value "${SWAP_FILE}")" == swap ]] \
    || { echo '기존 /swapfile이 swap 형식이 아닙니다.' >&2; exit 1; }
chown root:root "${SWAP_FILE}"
chmod 0600 "${SWAP_FILE}"

entries="$(awk '$1 == "/swapfile" && $1 !~ /^#/ { count++ } END { print count + 0 }' /etc/fstab)"
if [[ "${entries}" -eq 0 ]]; then
    printf '\n/swapfile none swap sw 0 0\n' >> /etc/fstab
elif [[ "${entries}" -ne 1 ]] || ! awk '$1 == "/swapfile" && $3 == "swap" && $4 !~ /(^|,)noauto(,|$)/ { found=1 } END { exit !found }' /etc/fstab; then
    echo '/etc/fstab의 /swapfile 항목이 중복되거나 swap 형식이 아닙니다.' >&2
    exit 1
fi

if ! swapon --show --noheadings --raw --output NAME | grep -Fxq "${SWAP_FILE}"; then
    swapon "${SWAP_FILE}"
fi
swapon --show --bytes
