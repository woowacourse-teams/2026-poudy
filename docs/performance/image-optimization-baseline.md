# 운영 이미지·HTTP/2 기준선 (2026-10-01)

이 문서는 10/1 당시 기록이다. 현재 서버 상태를 뜻하지 않는다. [적용 기록 #411](https://github.com/woowacourse-teams/2026-poudy/issues/411), [템플릿 동기화 PR #772](https://github.com/woowacourse-teams/2026-poudy/pull/772) 참고.

## Purpose

Record the production state before considering re-enabling Next.js image optimization
on the EC2 frontend. At capture, the production configuration set
`images.unoptimized: true`, so image requests are served from their source URLs rather
than through `/_next/image`.

## Snapshot

Captured on 2026-10-01 around 17:28 KST from the public production site. The page was
requested with `curl`; this is an HTTP snapshot, not a browser-rendered Lighthouse run.

| Measurement | Value |
| --- | ---: |
| `GET https://poudy.site/` | HTTP 200 |
| Negotiated protocol | HTTP/1.1 |
| HTML response body | 79,201 bytes |
| `<img>` elements in initial HTML | 17 |
| S3 image-host references in initial HTML | 24 |
| `/_next/image` references in initial HTML | 0 |

The HTTP version was checked with curl 8.7.1 built with nghttp2 support. Before the
Nginx change below, a request using `--http2` still negotiated HTTP/1.1.

The `img` and S3 counts describe the initial HTML only. They do not count image
requests added after client-side rendering, measure transferred image bytes, or
represent LCP.

## Frontend host baseline before HTTP/2

Captured from the production frontend EC2 through its existing SSM session on
2026-10-01 17:58 KST, before changing Nginx. This is a point-in-time host snapshot,
not a representative load test.

| Measurement | Before HTTP/2 |
| --- | ---: |
| Frontend EC2 memory | 550 / 910 MiB used; 279 MiB available |
| Swap | 248 / 511 MiB used |
| Next.js process RSS | 284,224 KiB (~277.6 MiB) |
| Next.js CPU sample | 0.1% |
| Root disk | 39% used (6.1 / 16 GiB) |
| `poudy-frontend.service` | active |
| `nginx.service` | active, Nginx 1.30.4 |
| Frontend service restart count | 0 |
| `GET /` response | HTTP 200, HTTP/1.1, 79,201 bytes, 103.6 ms (one request) |

## HTTP/2 change and after snapshot

On 2026-10-01, added `http2 on;` to both TLS server blocks in the production FE
Nginx configuration. `nginx -t` succeeded before an Nginx reload. The active
configuration is `/etc/nginx/conf.d/poudy-frontend.conf`; the original file was
backed up on the instance as `poudy-frontend.conf.bak.http2-20261001`. The same
directives were also prepared in the local deployment template but were uncommitted.
The repository synchronization is tracked in PR #772; a live-host change and a
repository change are separate steps. This historical record does not confirm the
protocol negotiated by the current deployment.

Five requests to `https://poudy.site/` with curl `--http2` all returned HTTP 200 over
HTTP/2 and transferred 79,201 bytes. Total time ranged from 45.9 to 53.6 ms (median
47.4 ms; mean 48.8 ms). Compared with the pre-change 103.6 ms sample, the post-change
median is about 54% lower. This is a measured improvement in the observed endpoint
response time and is worth reporting. The baseline has one request while the after
measurement has five, so treat 54% as an observed comparison rather than a controlled
estimate of HTTP/2's isolated effect.
Compatibility checks also returned HTTP 200 over HTTP/1.1 for the canonical domain and
HTTP 301 over HTTP/2 for `www.poudy.site`, preserving the redirect to the canonical host.

The post-change host snapshot at 2026-10-01 17:59 KST showed 560 / 910 MiB memory
used (269 MiB available), 245 / 511 MiB swap used, Next.js RSS 284,132 KiB at 0.1%
CPU, root disk at 39%, and the frontend service active with zero restarts. These
point samples show no material host-resource change, as expected for a protocol
configuration change.

HTTP/2 was verified at the public endpoint in this snapshot. Image optimization was disabled;
the image counts and byte figures above remain the pre-optimization baseline. Before
re-enabling Next.js image optimization, capture browser-rendered LCP and total image
bytes over repeat runs on the same route and runner, then compare those measurements
after the image change. The initial HTML counts do not include client-rendered image
requests or transferred image bytes.
