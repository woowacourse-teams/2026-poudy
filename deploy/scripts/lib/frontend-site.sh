#!/usr/bin/env bash

set -Eeuo pipefail

# 프론트 EC2가 받는 도메인은 환경마다 다르므로 Nginx 설정에는 자리표시자만 두고,
# 배포·초기화 때 deploy/config/frontend-site-<환경>.env 값으로 채웁니다.
POUDY_SITE_HOST=''
POUDY_SITE_ALIASES=''
POUDY_SITE_INDEXED=''
# 디자인 시스템 Storybook 의 정적 사이트 도메인(#859). 비우면 Storybook 을 열지 않는다.
POUDY_STORYBOOK_HOST=''

frontend_site_value() {
    local site_file="$1"
    local key="$2"

    sed -n "s/^${key}=//p" "${site_file}" | tail -n 1
}

load_frontend_site() {
    local site_file="$1"
    local host_pattern='^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'
    local aliases_pattern='^[a-z0-9. -]*$'

    [[ -f "${site_file}" ]] || return 1
    POUDY_SITE_HOST="$(frontend_site_value "${site_file}" POUDY_SITE_HOST)"
    POUDY_SITE_ALIASES="$(frontend_site_value "${site_file}" POUDY_SITE_ALIASES)"
    POUDY_SITE_INDEXED="$(frontend_site_value "${site_file}" POUDY_SITE_INDEXED)"
    POUDY_STORYBOOK_HOST="$(frontend_site_value "${site_file}" POUDY_STORYBOOK_HOST)"

    [[ "${POUDY_SITE_HOST}" =~ ${host_pattern} ]] || return 1
    [[ "${POUDY_SITE_ALIASES}" =~ ${aliases_pattern} ]] || return 1
    [[ "${POUDY_SITE_INDEXED}" =~ ^(true|false)$ ]] || return 1
    [[ -z "${POUDY_STORYBOOK_HOST}" || "${POUDY_STORYBOOK_HOST}" =~ ${host_pattern} ]] || return 1
}

frontend_site_cert_dir() {
    printf '/etc/letsencrypt/live/%s' "${POUDY_SITE_HOST}"
}

# Storybook 은 대표 도메인과 같은 인증서 lineage 를 쓴다. 인증서가 Storybook 도메인까지
# 포함할 때만 연다. 포함하지 않아도 앱 배포는 막지 않고 Storybook 만 건너뛴다.
# frontend-certificate.sh 의 frontend_certificate_covers_hosts 가 먼저 불려 있어야 한다.
frontend_storybook_enabled() {
    local certificate_path="$1"

    [[ -n "${POUDY_STORYBOOK_HOST}" ]] || return 1
    frontend_certificate_covers_hosts "${certificate_path}" "${POUDY_STORYBOOK_HOST}"
}

# 세 번째 인자가 1 이면 템플릿의 Storybook 구간을 남기고, 아니면 구간을 통째로 지운다.
render_frontend_nginx_config() {
    local template="$1"
    local output="$2"
    local storybook="${3:-0}"
    local storybook_filter=(-e '/__POUDY_STORYBOOK_BEGIN__/,/__POUDY_STORYBOOK_END__/d')

    if [[ "${storybook}" == 1 ]]; then
        storybook_filter=(-e '/__POUDY_STORYBOOK_BEGIN__/d' -e '/__POUDY_STORYBOOK_END__/d')
    fi

    sed \
        "${storybook_filter[@]}" \
        -e "s/__POUDY_SITE_HOST__/${POUDY_SITE_HOST}/g" \
        -e "s/__POUDY_SITE_ALIASES__/${POUDY_SITE_ALIASES}/g" \
        -e "s/__POUDY_STORYBOOK_HOST__/${POUDY_STORYBOOK_HOST}/g" \
        "${template}" >"${output}"
    ! grep -q '__POUDY_' "${output}"
}
