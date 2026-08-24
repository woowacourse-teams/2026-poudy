#!/usr/bin/env bash
#
# 브라우저 번들의 소스맵을 PostHog 로 올리고 산출물에서 지운다.
# EC2 운영 빌드(buildspec.yml)와 staging 배포 워크플로가 같은 규칙을 쓰도록 한 곳에 둔다.

set -Eeuo pipefail

# 공식 CLI 다. npm 의 posthog-cli 는 이름이 비슷한 제3자 패키지라 쓰지 않는다.
# 버전을 고정하지 않으면 릴리스마다 다른 도구가 산출물을 고친다.
readonly CLI_PACKAGE='@posthog/cli@0.14.1'

# 업로드한 청크를 묶는 이름. 릴리스 버전과 함께 어느 배포의 오류인지 가른다.
readonly RELEASE_NAME='poudy-client'

log() {
    printf '[poudy-sourcemap] %s\n' "$*"
}

fail() {
    printf '[poudy-sourcemap] ERROR: %s\n' "$*" >&2
    exit 1
}

count_sourcemaps() {
    find "$1" -type f -name '*.map' | wc -l | tr -d '[:space:]'
}

directory="${1:-}"
release_version="${2:-}"

[[ -n "${directory}" ]] || fail "사용법: $0 <번들 디렉터리> <릴리스 버전>"
[[ -n "${release_version}" ]] || fail "사용법: $0 <번들 디렉터리> <릴리스 버전>"
[[ -d "${directory}" ]] || fail "번들 디렉터리를 찾을 수 없습니다: ${directory}"

# 자격 증명이 없다고 배포를 막지는 않는다. 분석 도구가 빠지는 것과 서비스가 나가지 못하는
# 것은 무게가 다르다. 대신 건너뛴 사실을 조용히 넘기지 않는다.
if [[ -n "${POSTHOG_CLI_API_KEY:-}" && -n "${POSTHOG_CLI_PROJECT_ID:-}" ]]; then
    log "소스맵을 PostHog 로 올립니다: ${directory} (release ${RELEASE_NAME}@${release_version})"

    # --delete-after 가 업로드에 성공한 소스맵을 지우고 sourceMappingURL 주석까지 걷어낸다.
    npx --yes "${CLI_PACKAGE}" sourcemap process \
        --directory "${directory}" \
        --release-name "${RELEASE_NAME}" \
        --release-version "${release_version}" \
        --delete-after
else
    log 'WARNING: POSTHOG_CLI_API_KEY 또는 POSTHOG_CLI_PROJECT_ID 가 없어 업로드를 건너뜁니다.'
    log 'WARNING: 이 배포에서 난 오류는 minify 된 스택 추적으로만 남습니다.'
fi

# 업로드를 건너뛰었거나 일부만 올라갔을 때 남는다. 소스맵이 배포되면 원본 코드가 그대로
# 공개되므로, 올렸는지와 무관하게 산출물에서는 반드시 사라져야 한다.
leftover="$(count_sourcemaps "${directory}")"
if [[ "${leftover}" -gt 0 ]]; then
    log "산출물에 남은 소스맵 ${leftover} 개를 지웁니다."
    find "${directory}" -type f -name '*.map' -delete
fi

[[ "$(count_sourcemaps "${directory}")" -eq 0 ]] || fail '소스맵을 산출물에서 지우지 못했습니다.'

log "소스맵 처리를 마쳤습니다: ${directory}"
