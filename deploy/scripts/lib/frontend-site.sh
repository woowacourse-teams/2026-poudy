#!/usr/bin/env bash

set -Eeuo pipefail

# 프론트 EC2가 받는 도메인은 환경마다 다르므로 Nginx 설정에는 자리표시자만 두고,
# 배포·초기화 때 deploy/config/frontend-site-<환경>.env 값으로 채웁니다.
POUDY_SITE_HOST=''
POUDY_SITE_ALIASES=''

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

    [[ "${POUDY_SITE_HOST}" =~ ${host_pattern} ]] || return 1
    [[ "${POUDY_SITE_ALIASES}" =~ ${aliases_pattern} ]] || return 1
}

frontend_site_cert_dir() {
    printf '/etc/letsencrypt/live/%s' "${POUDY_SITE_HOST}"
}

render_frontend_nginx_config() {
    local template="$1"
    local output="$2"

    sed \
        -e "s/__POUDY_SITE_HOST__/${POUDY_SITE_HOST}/g" \
        -e "s/__POUDY_SITE_ALIASES__/${POUDY_SITE_ALIASES}/g" \
        "${template}" >"${output}"
    ! grep -q '__POUDY_SITE_' "${output}"
}
