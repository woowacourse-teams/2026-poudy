# Staging frontend latency investigation

## Measurement

- Target: `GET https://poudy-staging.vercel.app/categories`
- Method: k6 `ramping-arrival-rate`, 1 → 3 → 5 → 10 req/s, then recovery; 3m30s
- Requests: 764; achieved average 3.64 req/s, short peak 10 req/s
- Production was not loaded.

| Metric | Result |
| --- | ---: |
| HTTP 200 / HTML checks | 764 / 764 |
| Failed requests / timeouts | 0 / 0 |
| Average / median | 31.45 / 27.20 ms |
| p95 / p99 | 49.07 / 99.36 ms |
| Maximum | 530.11 ms |
| TTFB (`http_req_waiting`) p95 / max | 40.98 / 518.84 ms |
| TCP connect max / TLS max | 8.43 / 34.72 ms |
| Response receive max | 45.90 ms |

The slowest request spent almost all its time waiting for the first response byte. The page body transfer and TCP/TLS setup do not explain that sample. Ten subsequent GETs were all `x-vercel-cache: HIT`, with TTFB from 35.9 to 49.8 ms and total time from 42.7 to 67.7 ms.

The staging API was then measured with the existing GET-only scenario at the same 1 → 3 → 5 → 10 req/s schedule:

| Metric | Frontend `/categories` on Vercel | API `/api/categories` via staging EC2 |
| --- | ---: | ---: |
| Requests | 764 | 764 |
| HTTP errors / transport failures / timeouts | 0 / 0 / 0 | 0 / 0 / 0 |
| Average / median | 31.45 / 27.20 ms | 9.20 / 8.29 ms |
| p95 / p99 | 49.07 / 99.36 ms | 13.93 / 24.16 ms |
| Maximum | 530.11 ms | 75.39 ms |
| TTFB max | 518.84 ms | 74.02 ms |

The API path remained fast through the same rate profile. This makes sustained staging backend saturation unlikely under this test; it does not exclude a transient spike outside the test window.

## What this establishes

The low-rate staging run was healthy and did not expose capacity saturation: all responses were 200, p95 was about 49 ms, and only the tail had an isolated 530 ms response. It does not prove a Vercel compute bottleneck; the slow sample did not capture `x-vercel-cache` or Vercel request ID, and k6's waiting time includes the remote edge/origin response path.

The Grafana probe screenshot showed six-hour maxima of 724 ms for the staging page and 957 ms for the staging public API, while current values were 37.0 ms and 24.4 ms and all four current HTTP status values were 200. Because the staging API uses the EC2/Nginx/backend path, frontend hosting alone cannot explain every staging outlier. That screenshot's public probes originate from the Monitoring EC2, while this k6 run originated from the developer machine; they are different network vantage points.

The existing probe compared production `/categories` with the staging Vercel root `/`. The staging target is now `/categories`, so both frontends exercise the same page. The dashboard includes `probe_http_duration_seconds` by phase (resolve, connect, TLS, processing, transfer) to locate future outliers in the public path. On 2026-09-28, both changes were deployed to Monitoring EC2. Prometheus loaded the new target after its container was restarted to refresh a single-file bind mount; its config passed `promtool`, the Grafana dashboard displayed the new phase panel, and all four public probes were `UP` with HTTP 200.

The first phase samples are visible in Grafana. A recent staging frontend sample showed most time in `processing` (about 28 ms), with resolve, connect, TLS, and transfer each under about 12 ms. The six-hour view still contains the prior root URL's historical series, so its maxima are not a clean comparison of the new `/categories` target until the old samples age out of that time window.

## Limits and next diagnosis

- This is a low-rate smoke/load run, not a capacity test; maximum observed concurrency was one VU.
- No code or instance resizing is justified by this sample.
- After deploying the monitoring config change, compare a new staging outlier's phase metrics with staging Nginx/Actuator, Vercel `x-vercel-cache`/`x-vercel-id`, and the Monitoring EC2's own CPU/network. Capture response headers on every load-test request so a slow TTFB can be separated into cache HIT/MISS/STALE.
- If `processing` is high while the edge reports MISS/STALE, inspect Vercel generation and ISR/cache behavior. If `resolve`, `connect`, or `tls` is high, inspect the public network path. If only the staging API processing phase is high, correlate Nginx upstream and Spring request histograms before changing EC2 sizing.
