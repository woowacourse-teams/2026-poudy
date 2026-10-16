#!/usr/bin/env bash
# GNU time의 CPU 시간과 최대 RSS를 보관한다. RSS는 동시 프로세스 전체 합계가 아니다.
set -Eeuo pipefail

label="${1:?측정 이름이 필요합니다.}"
shift
[[ "$label" =~ ^[a-z0-9-]+$ ]] || exit 2
metrics="${CODEBUILD_SRC_DIR:-${PWD}}/.artifacts/metrics"
mkdir -p "$metrics"
printf '[poudy-build] %s start=%s\n' "$label" "$(date -u +%FT%TZ)"

if [[ "$(uname -s)" == Linux && -x /usr/bin/time ]]; then
    status=0
    /usr/bin/time -v -o "$metrics/$label.txt" "$@" || status=$?
else
    printf 'GNU time unavailable; shell timing only.\n' > "$metrics/$label.txt"
    status=0
    { time "$@"; } 2>> "$metrics/$label.txt" || status=$?
fi
cat "$metrics/$label.txt"
printf '[poudy-build] %s end=%s status=%s\n' "$label" "$(date -u +%FT%TZ)" "$status"
exit "$status"
