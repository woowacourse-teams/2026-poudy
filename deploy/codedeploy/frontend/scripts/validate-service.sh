#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SITE_FILE="${SCRIPT_DIR}/../nginx/frontend-site.env"

site_library="${SCRIPT_DIR}/lib/frontend-site.sh"
if [[ ! -f "${site_library}" ]]; then
    site_library="${SCRIPT_DIR}/../../../scripts/lib/frontend-site.sh"
fi
# shellcheck source=deploy/scripts/lib/frontend-site.sh
source "${site_library}"

load_frontend_site "${SITE_FILE}" || {
    echo "frontend validation failed: 프론트 도메인 설정이 없거나 형식이 맞지 않습니다: ${SITE_FILE}" >&2
    exit 1
}
readonly CERT_DIR="$(frontend_site_cert_dir)"

if [[ -s "${CERT_DIR}/fullchain.pem" \
    && -s "${CERT_DIR}/privkey.pem" ]]; then
    readonly HTTPS_MODE=1
    readonly BASE_URL="https://${POUDY_SITE_HOST}"
    readonly CURL_TLS_ARGS=(--insecure --resolve "${POUDY_SITE_HOST}:443:127.0.0.1")
else
    readonly HTTPS_MODE=0
    readonly BASE_URL='http://127.0.0.1'
    readonly CURL_TLS_ARGS=()
fi

fail_validation() {
    echo "frontend validation failed: $*" >&2
    systemctl status poudy-frontend.service nginx.service --no-pager -l >&2 || true
    journalctl -u poudy-frontend.service -u nginx.service --no-pager -n 80 >&2 || true
    exit 1
}

ready=0
for attempt in {1..24}; do
    if curl --fail --silent --show-error --max-time 3 "${CURL_TLS_ARGS[@]}" \
        "${BASE_URL}/nginx-health" >/dev/null \
        && curl --fail --silent --show-error --max-time 3 "${CURL_TLS_ARGS[@]}" \
            "${BASE_URL}/" >/dev/null \
        && curl --fail --silent --show-error --max-time 3 "${CURL_TLS_ARGS[@]}" \
            "${BASE_URL}/api/categories" >/dev/null \
        && curl --fail --silent --show-error --max-time 3 \
            "http://127.0.0.1:8081/api/categories" >/dev/null; then
        ready=1
        break
    fi
    sleep 5
done

[[ "${ready}" -eq 1 ]] || fail_validation 'health check timed out'

nginx -t || fail_validation 'nginx configuration is invalid'

if [[ "${HTTPS_MODE}" -eq 1 ]]; then
    readonly CANONICAL_PROBE_PATH='/products/601?source=canonical-probe'
    readonly EXPECTED_REDIRECT="301 https://${POUDY_SITE_HOST}${CANONICAL_PROBE_PATH}"

    for alias_host in ${POUDY_SITE_ALIASES}; do
        http_redirect="$(curl --silent --show-error --max-time 3 \
            --resolve "${alias_host}:80:127.0.0.1" \
            --output /dev/null \
            --write-out '%{http_code} %{redirect_url}' \
            "http://${alias_host}${CANONICAL_PROBE_PATH}")" \
            || fail_validation "${alias_host} HTTP redirect probe failed"
        [[ "${http_redirect}" == "${EXPECTED_REDIRECT}" ]] \
            || fail_validation "unexpected ${alias_host} HTTP redirect: ${http_redirect}"

        https_redirect="$(curl --silent --show-error --max-time 3 \
            --resolve "${alias_host}:443:127.0.0.1" \
            --output /dev/null \
            --write-out '%{http_code} %{redirect_url}' \
            "https://${alias_host}${CANONICAL_PROBE_PATH}")" \
            || fail_validation "${alias_host} HTTPS redirect probe failed"
        [[ "${https_redirect}" == "${EXPECTED_REDIRECT}" ]] \
            || fail_validation "unexpected ${alias_host} HTTPS redirect: ${https_redirect}"
    done

    for acme_host in "${POUDY_SITE_HOST}" ${POUDY_SITE_ALIASES}; do
        acme_status="$(curl --silent --show-error --max-time 3 \
            --resolve "${acme_host}:80:127.0.0.1" \
            --output /dev/null \
            --write-out '%{http_code}' \
            "http://${acme_host}/.well-known/acme-challenge/poudy-deployment-probe")" \
            || fail_validation "${acme_host} ACME route probe failed"
        [[ "${acme_status}" == '404' ]] \
            || fail_validation "${acme_host} ACME route was redirected or exposed an unexpected response: ${acme_status}"
    done
fi

main_pid="$(systemctl show --property MainPID --value poudy-frontend.service)"
[[ "${main_pid}" =~ ^[1-9][0-9]*$ && -r "/proc/${main_pid}/environ" ]] \
    || fail_validation 'frontend MainPID environment is unavailable'
grep --null-data --fixed-strings --line-regexp --quiet \
    'POUDY_SERVER_API_BASE_URL=http://127.0.0.1:8081' \
    "/proc/${main_pid}/environ" \
    || fail_validation 'frontend server API origin is not the loopback listener'

listener_addresses="$(ss -H -ltn 'sport = :8081' | awk '{print $4}')"
[[ "${listener_addresses}" == '127.0.0.1:8081' ]] \
    || fail_validation "unexpected :8081 listener: ${listener_addresses:-none}"

# 앱은 검색 엔진 색인을 허용하는 환경(production)에서만 runtime sitemap을 제공하고
# 그 밖에서는 404를 돌려줍니다. 색인하지 않는 환경은 sitemap이 막혀 있는지만 확인합니다.
if [[ "${POUDY_SITE_INDEXED}" != 'true' ]]; then
    sitemap_status="$(curl --silent --show-error --max-time 10 "${CURL_TLS_ARGS[@]}" \
        --output /dev/null \
        --write-out '%{http_code}' \
        "${BASE_URL}/sitemap-pages.xml")" \
        || fail_validation 'page sitemap probe failed'
    [[ "${sitemap_status}" == '404' ]] \
        || fail_validation "sitemap must be hidden on a non-indexed site: ${sitemap_status}"
    exit 0
fi

# 가장 작은 runtime sitemap만 한 번 warm-up한 뒤 query와 개인화/RSC 헤더를
# 바꾼 요청이 같은 공개 cache entry를 사용하는지 확인합니다. 운영 캐시는 지우지
# 않으므로 정상 stale/background update 중인 배포도 실패시키지 않습니다.
sitemap_headers="$(mktemp)"
trap 'rm -f "${sitemap_headers}"' EXIT

curl --fail --silent --show-error --max-time 70 "${CURL_TLS_ARGS[@]}" \
    --dump-header "${sitemap_headers}" \
    --output /dev/null \
    "${BASE_URL}/sitemap-pages.xml" \
    || fail_validation 'page sitemap warm-up failed'

sitemap_cache_status=''
for attempt in {1..5}; do
    curl --fail --silent --show-error --max-time 70 "${CURL_TLS_ARGS[@]}" \
        --header 'Cookie: poudy_sitemap_probe=1' \
        --header 'Authorization: Bearer deployment-probe' \
        --header 'RSC: 1' \
        --dump-header "${sitemap_headers}" \
        --output /dev/null \
        "${BASE_URL}/sitemap-pages.xml?deployment-probe=1" \
        || fail_validation 'page sitemap cache probe failed'

    sitemap_cache_status="$(awk 'BEGIN { IGNORECASE = 1 } /^X-Poudy-Cache:/ { gsub("\\r", "", $2); print $2 }' \
        "${sitemap_headers}" | tail -n 1)"
    if [[ "${sitemap_cache_status}" =~ ^(HIT|UPDATING|STALE)$ ]]; then
        break
    fi
    sleep 1
done

[[ "${sitemap_cache_status}" =~ ^(HIT|UPDATING|STALE)$ ]] \
    || fail_validation "page sitemap cache was not reused: ${sitemap_cache_status:-missing}"
grep --ignore-case --quiet '^Content-Type: application/xml' "${sitemap_headers}" \
    || fail_validation 'page sitemap content type is not XML'
if grep --ignore-case --quiet --extended-regexp '^(Set-Cookie|Vary):' "${sitemap_headers}"; then
    fail_validation 'page sitemap exposed a personalized or variant response header'
fi
