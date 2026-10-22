# Production image delivery baseline (2026-10-02)

Five Lighthouse CI reports for `https://poudy.site/` were captured. Per-run metrics,
settings and original SHA256 values are in [run-summary.json](run-summary.json).
Full original reports are retained locally rather than copied into Git.
The test used `@lhci/cli@0.15.1`, mobile emulation at 412×823 with DPR 1.75, and
Lighthouse simulated throttling (150ms RTT, 4× CPU slowdown). These are lab results,
not real-user metrics.

Reproduction command, run from `client/`:

```sh
pnpm dlx @lhci/cli@0.15.1 autorun \
  --collect.url=https://poudy.site/ \
  --collect.numberOfRuns=5 \
  --upload.target=filesystem \
  --upload.outputDir=../load-tests/results/lhci-new-baseline
```

Five-run medians: LCP 5,730ms (5,480–8,994ms), image transfer 127,849 bytes
(127,689–127,849 bytes), total transfer 1,147,422 bytes (1,145,080–1,147,765
bytes). Lighthouse estimated about 99,870 bytes of savings from properly sizing
images; this is an estimate, not a measured improvement.

Median LCP phases: TTFB 610ms, Load Delay 1,545ms, image Load Time 2,661ms,
Render Delay 799ms. The LCP image was a curation banner. Its discovery insight
reported that it was present in the initial document and eagerly loaded, but did
not have a `fetchpriority=high` hint. The separate browser-observed LCP in these
reports is not RUM and should not be mixed with the throttled simulated LCP.

## Lighthouse image resize candidates

The table uses the median across five reports. Estimated savings are Lighthouse projections, not observed after-values.

| S3 key | Original bytes | Display box (CSS px) | Estimated savings (bytes) |
|---|---:|---:|---:|
| `images/products/토리든_밸런스풀 시카 진정 버블 세럼.webp` | 19,674 | 120×112 | 19,173 |
| `images/curations/curation_1_banner.webp` | 24,846 | 266×142 | 17,203 |
| `images/products/토리든_셀메이징 저분자 콜라겐 탄력 버블 세럼.webp` | 16,746 | 120×112 | 16,319 |
| `images/products/닥터지_에이클리어 스팟 포 페이스 세럼.webp` | 13,848 | 120×112 | 13,365 |
| `images/products/아비브_글루타치온좀 CC 선크림 토닝 튜브 SPF50+ PA++++.webp` | 12,262 | 120×112 | 11,743 |
| `images/curations/curation_2_banner.webp` | 13,292 | 266×142 | 9,203 |
| `images/products/차앤박_더마앤서 배리어 리셋 크림.webp` | 9,102 | 120×112 | 7,989 |
| `images/products/제로이드_핌프로브 카밍 앰플.webp` | 5,554 | 120×112 | 4,875 |

Total projected savings over 8 unique objects: 99,870 bytes per homepage run.
