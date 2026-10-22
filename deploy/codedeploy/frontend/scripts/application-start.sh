#!/usr/bin/env bash

set -Eeuo pipefail

systemctl daemon-reload
systemctl enable nginx.service poudy-frontend.service
"$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/reconcile-nginx.sh"
# 페이지 sitemap의 화면 기준일(SCREEN_UPDATED_AT)은 빌드에 들어가므로, 이전 빌드의 XML을
# 남기면 최대 24시간 동안 바뀐 lastmod가 나가지 않고 검색 엔진 알림도 바뀐 URL을 찾지 못합니다.
# 기준일이 그대로인 배포에서 비워도 다시 만든 XML의 lastmod는 같아 검색 엔진에는 바뀌지 않습니다.
# 프론트는 BeforeInstall에서 멈춰 있어 Nginx 재시작 전에 비우면 이전 빌드가 다시 채우지 못합니다.
find /var/cache/nginx/poudy_sitemaps -mindepth 1 -delete
systemctl restart nginx.service
systemctl restart poudy-frontend.service
