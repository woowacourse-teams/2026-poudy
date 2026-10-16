# Staging CDN follow-up: product list

Measured the `/products` list page on immutable staging deployments before and after the staging-only CloudFront URL setting. No frontend implementation was changed for this measurement.

- Before: Client Staging Deploy #144, `https://poudy-staging-iitfmxuhv-inaemins-projects.vercel.app/products`
- After: Client Staging Deploy #145, `https://poudy-staging-oiuhrj2hf-inaemins-projects.vercel.app/products`
- Five Lighthouse CLI 13.4.1 runs per deployment, HeadlessChrome 154, mobile viewport 412×823 / DPR 1.75, Moto G Power user agent, simulated Slow 4G (150ms RTT, 4× CPU slowdown).
- Each run starts with Lighthouse storage reset. CloudFront edge state can persist between runs; this is not a deterministic cold-edge benchmark.

| Metric | Before median (range) | After median (range) |
|---|---:|---:|
| Performance | 73 (62–79) | 64 (63–78) |
| LCP | 5,894ms (5,225–6,562) | 6,009ms (4,553–6,077) |
| FCP | 1,821ms (1,530–3,590) | 3,600ms (1,553–3,902) |
| TBT | 177ms (51–222) | 175ms (167–199) |
| Speed Index | 4,206ms (2,707–5,673) | 5,653ms (4,451–5,818) |
| CLS | 0.055 (0–0.060) | 0 (0–0.005) |
| Image requests / transferred bytes | 20 / 73,004 bytes | 20 / 71,315 bytes (71,241–71,348) |
| S3-backed target images | 20 direct S3 requests | 20 CloudFront requests |

The product-list LCP median did not improve (+115ms, about 2%) and the before/after LCP ranges overlap substantially. Transferred image bytes were about 2.3% lower after the host switched, but request count did not change. The Lighthouse metrics varied substantially within each five-run group, so this page does not provide evidence of a repeatable LCP improvement from CDN alone. It does verify that all 20 target image requests use the intended S3 or CloudFront host in their respective deployments.

[run-summary.json](run-summary.json) contains the metrics, settings and SHA256 of the ten original reports. Full reports are retained locally.

## SSR stream timing follow-up for issue #616

Re-read the same 10 reports to separate the initial response from the end of the HTML document. Lighthouse browser storage was reset per run, but the Next/Vercel data cache was not reset or observed, so these runs cannot be labeled server-cache-cold or server-cache-warm.

| Timing (median, range) | Before (#144) | After (#145) |
|---|---:|---:|
| Lighthouse root-document server-response-time audit | 8ms (8–10ms) | 8ms (8–10ms) |
| LCP breakdown TTFB | 40ms (33–63ms) | 39ms (37–42ms) |
| Main document completion | 494ms (329–1,757ms) | 505ms (484–1,693ms) |
| First product image request start | 502ms (316–1,758ms) | 518ms (491–1,692ms) |

Across all 10 runs, the first product image started from 13ms before to 14ms after document completion. The initial TTFB was short while document completion varied substantially, so the observed delay is associated with streamed product content becoming available after the first byte. The Lighthouse trace does not expose the exact React stream chunk boundary, and it does not attribute the delay to either API call.

In both deployments, run 1 completed at about 1.7s, while the other four completed within 329–532ms (#144) or 484–555ms (#145). This is compatible with a cold function start or a cold Next data cache followed by faster requests, but does not distinguish those explanations. Browser storage reset only clears browser-side state.

Per-fetch timings, cache-hit state, and a correlation with individual staging API requests were not available in this session. The Vercel log connector did not complete authentication, direct staging/AWS requests could not establish network connections, and the issue-body update was rejected by the GitHub integration (403 `Resource not accessible by integration`). No remediation was tested, since the delayed upstream segment has not yet been identified.

## Staging API spot probe (2026-10-04)

From an SSM session on `ec2-poudy-staging-be`, sent five sequential GET requests to each public staging API endpoint. All ten returned HTTP 200.

| Endpoint | Total response time, median (range) |
|---|---:|
| `/api/products` | 93.6ms (85.1–105.2ms) |
| `/api/exclude-codes` | 24.0ms (23.7–24.7ms) |

These timings include the request from the backend instance to the public staging hostname, including DNS, connection, TLS, and proxy overhead. They are not the Vercel server component's fetch timings and do not reveal Next Data Cache state. They make a persistently slow backend response less likely as the sole explanation for the 329–1,757ms document-completion spread, but do not rule out a slower individual request, a Vercel cold start, or a cache effect.

The staging API Nginx virtual host has `access_log off`; the global access-log format also does not include `$request_time`. Its retained access log therefore cannot correlate these requests or supply per-request origin latency. The deployed API instance uses the default global access log format, unlike the request-time format in the repository's generic `deploy/nginx/ec2-nginx.conf` template.


## Historical limits and follow-up

These observations describe the Vercel setup on 2026-10-03/04. They do not describe
current staging, which later moved to EC2. Per-fetch instrumentation prepared locally
for #616 was not deployed, so it did not establish the cause of the streaming delay.
It is excluded from this evidence PR. Browser storage reset did not establish server
cache state. No speculative frontend fix was adopted from these results.

Related: [#608](https://github.com/woowacourse-teams/2026-poudy/issues/608),
[#615](https://github.com/woowacourse-teams/2026-poudy/issues/615),
[#616](https://github.com/woowacourse-teams/2026-poudy/issues/616).
