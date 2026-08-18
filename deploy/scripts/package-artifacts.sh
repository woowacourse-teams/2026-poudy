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

mkdir -p "${output_dir}/backend" "${output_dir}/frontend"

log '백엔드 JAR를 빌드합니다.'
(
    cd "${REPOSITORY_ROOT}/server"
    ./gradlew bootJar
)

shopt -s nullglob
backend_jars=("${REPOSITORY_ROOT}"/server/build/libs/*.jar)
[[ "${#backend_jars[@]}" -eq 1 ]] || fail "백엔드 JAR를 하나로 확인할 수 없습니다. 발견 수: ${#backend_jars[@]}"
cp "${backend_jars[0]}" "${output_dir}/backend/app.jar"

log '프론트엔드 standalone 산출물을 빌드합니다.'
(
    cd "${REPOSITORY_ROOT}/client"
    pnpm install --frozen-lockfile
    pnpm build
)

[[ -f "${REPOSITORY_ROOT}/client/.next/standalone/server.js" ]] || fail 'Next.js standalone server.js를 찾을 수 없습니다.'
cp -R "${REPOSITORY_ROOT}/client/.next/standalone/." "${output_dir}/frontend/"
mkdir -p "${output_dir}/frontend/.next"
cp -R "${REPOSITORY_ROOT}/client/.next/static" "${output_dir}/frontend/.next/static"

if [[ -d "${REPOSITORY_ROOT}/client/public" ]]; then
    cp -R "${REPOSITORY_ROOT}/client/public" "${output_dir}/frontend/public"
fi

log "배포 산출물을 생성했습니다: ${output_dir}"
find "${output_dir}" -maxdepth 2 -type f -print | sort
