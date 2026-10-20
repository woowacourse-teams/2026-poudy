#!/usr/bin/env bash

set -Eeuo pipefail

[[ "$#" -ge 1 ]] || { echo "usage: $0 <canonical host> [alias host ...]" >&2; exit 1; }
readonly CANONICAL_HOST="$1"
shift

verify_response() {
    local url="$1"
    local expected="$2"
    local actual

    # --http2는 서버가 지원하지 않으면 HTTP/1.1로도 성공하므로 응답 버전을 비교한다.
    # --resolve/--insecure/--location 없이 공개 DNS, 인증서와 최초 응답을 확인한다.
    actual="$(curl --http2 --fail --silent --show-error \
        --connect-timeout 3 --max-time 10 --output /dev/null \
        --write-out '%{http_code} %{http_version} redirect=%{redirect_url}' "${url}")" || {
        echo "HTTP/2 probe failed: ${url} (curl must support HTTP/2)" >&2
        return 1
    }
    [[ "${actual}" == "${expected}" ]] || {
        echo "unexpected HTTP/2 response for ${url}: ${actual} (expected: ${expected})" >&2
        return 1
    }
}

verify_response "https://${CANONICAL_HOST}/" '200 2 redirect='

readonly PROBE_PATH='/products/601?source=canonical-probe'
for alias_host in "$@"; do
    verify_response "https://${alias_host}${PROBE_PATH}" \
        "301 2 redirect=https://${CANONICAL_HOST}${PROBE_PATH}"
done
