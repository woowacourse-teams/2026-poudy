#!/usr/bin/env bash

set -Eeuo pipefail

if [[ -s /etc/letsencrypt/live/poudy.site/fullchain.pem \
    && -s /etc/letsencrypt/live/poudy.site/privkey.pem ]]; then
    readonly BASE_URL='https://poudy.site'
    readonly CURL_TLS_ARGS=(--insecure --resolve poudy.site:443:127.0.0.1)
else
    readonly BASE_URL='http://127.0.0.1'
    readonly CURL_TLS_ARGS=()
fi

for attempt in {1..24}; do
    if curl --fail --silent --show-error --max-time 3 "${CURL_TLS_ARGS[@]}" \
        "${BASE_URL}/nginx-health" >/dev/null \
        && curl --fail --silent --show-error --max-time 3 "${CURL_TLS_ARGS[@]}" \
        "${BASE_URL}/" >/dev/null \
        && curl --fail --silent --show-error --max-time 3 "${CURL_TLS_ARGS[@]}" \
        "${BASE_URL}/api/categories" >/dev/null; then
        exit 0
    fi
    sleep 5
done

echo "frontend health check failed" >&2
systemctl status poudy-frontend.service nginx.service --no-pager -l >&2 || true
journalctl -u poudy-frontend.service -u nginx.service --no-pager -n 80 >&2 || true
exit 1
