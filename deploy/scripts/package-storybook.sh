#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

log() {
    printf '[poudy-package] %s\n' "$*"
}

fail() {
    printf '[poudy-package] ERROR: %s\n' "$*" >&2
    exit 1
}

output_dir="${1:-}"
[[ -n "${output_dir}" ]] || fail "사용법: $0 <출력 디렉터리>"
[[ ! -e "${output_dir}" ]] || fail "출력 디렉터리가 이미 존재합니다: ${output_dir}"
# pnpm --filter 는 패키지 디렉터리에서 실행되므로 상대 경로를 미리 절대 경로로 바꾼다.
mkdir -p "$(dirname -- "${output_dir}")"
output_dir="$(cd -- "$(dirname -- "${output_dir}")" && pwd)/$(basename -- "${output_dir}")"

# 디자인 시스템 Storybook 을 정적 파일로 빌드한다(#859). 프론트 EC2 에서는 빌드하지 않고
# 이 결과를 프론트 산출물과 함께 올린다. Storybook 은 client 에 설치된 Next 의 React canary 를
# 빌려 쓰므로(design-system/.storybook/main.ts) 저장소 전체의 의존성을 설치한다.
log '디자인 시스템 Storybook 정적 파일을 빌드합니다.'
(
    cd "${REPOSITORY_ROOT}"
    pnpm install --frozen-lockfile
    pnpm --filter @poudy/design-system run build-storybook --quiet --output-dir "${output_dir}"
)

[[ -f "${output_dir}/index.html" && -f "${output_dir}/iframe.html" ]] \
    || fail "Storybook 산출물에 index.html 또는 iframe.html 이 없습니다: ${output_dir}"

log "Storybook 산출물을 생성했습니다: ${output_dir}"
