# Search visibility audit — 2026-09-26

Worktree: `2026-poudy-seo`; branch: `feat/client-search-visibility`.
Rebased onto team repository `upstream/dev`, commit `b5864f1c`.
Method: [fire-your-seo-agency](https://github.com/leopard627/fire-your-seo-agency), crawler-first audit.

## Baseline

Public HTTP responses were fetched without JavaScript from `https://poudy.site`.

| Lane    | Status        | Evidence before changes                                                                                                                                                                      |
| ------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEO     | Partial       | Home is rendered in HTML; robots meta is `index, follow`. Sitemap index links three parts. Product sitemap has 472 URLs; ingredient sitemap has 1,398 URLs. Home h1 contains only the brand. |
| AEO     | Partial       | `/ingredients/1` renders its description, source labels and update date, but has no JSON-LD. No search-answer citation measurement is available.                                             |
| GEO     | Missing guide | `/llms.txt` returns HTTP 404. Wildcard robots policy permits public detail pages, including for AI crawlers.                                                                                 |
| LLMO    | Partial       | Home includes WebSite/Organization JSON-LD and official Instagram identity. Model recognition has not been measured.                                                                         |
| Naver   | Partial       | Site verification meta exists and robots allows Yeti via the wildcard policy. Ownership verification and sitemap submission in Search Advisor cannot be established from HTML.               |
| Content | Partial       | Existing curations and ingredient reference pages provide content. No blog/feed workflow exists in this project. Search query analytics are needed before choosing new landing pages.        |

Home title: `Poudy(파우디) | 화장품 전성분 검색`.
Ingredient sample title: `가공소금 성분 정보 | Poudy`.
These are technical observations, not a traffic or ranking baseline.

## Changes

1. Home now renders the existing service description and direct product/ingredient search links as visible HTML. Its sitemap lastmod reflects this content change.
2. Ingredient detail now renders WebPage/DefinedTerm JSON-LD using the same API object as the visible page: Korean/English name, description, source labels and recorded update time. No source URLs, medical claims, ratings or authors are invented. Stable IDs reference the existing WebSite entity.
3. `/llms.txt` provides a concise Korean directory using the configured canonical origin. It explains how to locate and cite detail-page sources and dates. Nonproduction deployments return an empty, noncached 404, matching the sitemap discovery policy.

Schema references: [WebPage](https://schema.org/WebPage), [DefinedTerm](https://schema.org/DefinedTerm).
The [llms.txt proposal](https://llmstxt.org/) is a discovery aid; its presence does not establish crawler adoption or citations.

## Verification and deployment gate

- The requested staging target `https://poudy-staging.vercel.app` was inspected on 2026-09-26: home and `/ingredients/1` return 200; home canonical points to staging and robots meta is `noindex, nofollow`; robots.txt disallows `/`; sitemap and llms.txt return 404. No `X-Robots-Tag` header was present on the home response. The new home section and ingredient JSON-LD are absent, so this deployment does not yet contain the worktree changes. The staging workflow deploys on pushes to `dev`; no deployment was triggered during this audit.
- Existing SEO tests plus new discovery-policy and ingredient-data checks cover production/staging behavior and fact propagation.
- Next.js route types, TypeScript and lint checks run against the installed version (`16.3.0`).
- Before-change production responses were inspected with curl. After-change HTTP validation remains pending: local server execution required elevated permission and was declined. Unit tests do not substitute for this gate.
- After deployment, fetch `/`, `/ingredients/1`, `/llms.txt`, `/robots.txt` and all sitemap parts with curl. Check for visible description/search links, parse the ingredient JSON-LD, verify canonical URLs, confirm `index, follow` and inspect `X-Robots-Tag` headers. Confirm an unknown route returns 404. Validate the ingredient schema with Schema.org Validator.
- Verify `/llms.txt` and sitemap return 404 on staging, and staging retains `noindex`.

## Measurement plan

Record the deployment date as D0. If deployed on 2026-09-26, review on **2026-10-10**; otherwise use D0 + 14 days. No reminder has been scheduled.

1. At D0 export the previous 28 days of Google Search Console impressions, clicks, CTR, position and indexed pages, separated into home/products/ingredients/curations. Export the equivalent Naver Search Advisor metrics and top queries. Record missing access as unknown, never zero.
2. Confirm verified ownership and sitemap submission in Google, Bing Webmaster Tools and Naver Search Advisor using the owner's accounts.
3. At D0 and D0 + 14 days test the same five questions in ChatGPT search, Perplexity and Naver AI Briefing. Save the exact prompt, date, answer and cited URLs: what is Poudy; where to search cosmetic ingredients; how to find cosmetics excluding an ingredient; what processed salt does in cosmetics; how to find products containing a particular ingredient. Keep product/ingredient names constant between runs.
4. At D0 + 14 days compare equal-length windows before and after deployment, excluding the latest three days and matching weekdays. Review 28-day trends again at D0 + 28 days. Track citations independently from traffic. Use dated hosting logs to monitor AI crawler visits when available.
5. Build the next content backlog from actual query exports: query, intent, current landing URL, impressions/clicks, factual source, owner and review date. Publish new pages only after factual review, SSR/meta/canonical validation, internal links and sitemap inclusion.

Account-only analytics, actual AI citations, IndexNow credentials and new editorial content remain unverified or unconfigured. Creating a blog or medical FAQ without reviewed source material is outside this technical change. Search ranking improvement has not yet been measured.
