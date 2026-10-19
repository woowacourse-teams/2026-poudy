# Issue #615: product-list LCP investigation

## Setup

- Source: commit `a94f57f` (`issue/608-image-delivery`), Next.js production build. The S3 and CloudFront variants differ only by `NEXT_PUBLIC_IMAGE_CDN_BASE_URL`.
- Data/API: staging API (`https://staging.poudy.site`); all conditions rendered 20 product cards and selected the first 80×80 product thumbnail as the LCP element.
- A third build added `fetchPriority="high"` only to the existing eager first thumbnail. This code was used only for the experiment and was reverted because the LCP result did not improve.
- The Next app itself was served locally at `http://127.0.0.1:3015`; only image delivery went directly to S3 or to the Poudy CloudFront distribution. This isolates image-host effects but does not reproduce Vercel's server-side streaming latency.
- Lighthouse CLI 13.4.1, headless Chrome 154, Moto G Power mobile emulation (412×823, DPR 1.75), simulated Slow 4G (150ms RTT), 4× CPU slowdown; five runs per condition. Browser storage was reset for each run; CloudFront edge cache could persist.
- [run-summary.json](run-summary.json) preserves metrics, settings and SHA256 for all 15 valid original reports. Full reports are retained locally. An initial standalone-server run returned 404 for app JS/CSS/fonts and is excluded.

## Results

| Metric (median, range) | S3, no priority hint | CloudFront, no hint | CloudFront, `fetchpriority=high` |
|---|---:|---:|---:|
| Performance | 76 (75–78) | 77 (76–79) | 77 (76–78) |
| LCP | 6,027ms (5,593–6,036) | 6,028ms (5,437–6,043) | 6,029ms (5,430–6,041) |
| FCP | 1,662ms (1,660–1,671) | 1,662ms (1,660–1,666) | 1,661ms (1,057–1,665) |
| TBT | 110ms (72–153) | 86ms (71–126) | 107ms (82–144) |
| LCP image request duration | 84.7ms (75–94) | 43.6ms (38–49) | 50.0ms (47–58) |
| Image bytes (20 requests) | 73,004 (72,604–73,004) | 71,355 (71,204–71,371) | 71,362 (71,357–71,365) |
| HTML document completion | 30.2ms (22–35) | 31.8ms (25–44) | 23.3ms (22–37) |
| LCP image request priority | Low in all 5 runs | Low in all 5 runs | High in all 5 runs |
| LCP image protocol | HTTP/1.1 | HTTP/2 | HTTP/2 |

LCP uses Lighthouse's simulated metric; the insight subparts are reported separately and do not sum to that simulated value.

## Interpretation

CloudFront cut the observed LCP image transfer interval by about 41ms (49%) and reduced the 20-image payload by about 2.3%, while total LCP stayed effectively unchanged. Adding `fetchpriority=high` reliably changed the browser's request priority from Low to High, but did not improve the five-run LCP median. We therefore did not keep a frontend code change based on this experiment.

In this isolated local-server setup, the document and image are discovered early (around 30–40ms); it does not reproduce the 0.3–1.8s document completion spread from the earlier immutable staging deployments. In those reports the first product-image request began at or just after HTML response completion. The source route also waits for both `fetchProducts()` and `fetchExcludeCodes()` before rendering the product list inside its stream boundary. Together this points to staging's server-side content preparation / streamed HTML availability as the next segment to instrument; it does not yet identify which upstream call or cache state owns the delay.

The controlled data does not support saying CloudFront lowered the image priority: without an explicit hint, S3 and CloudFront both produced Low priority locally. The older High/Low observation was not reproduced under same-build conditions, so it remains a host/deployment/trace confounder rather than an established CDN regression.


Related: [#615](https://github.com/woowacourse-teams/2026-poudy/issues/615). These are historical observations, not current deployment claims.
