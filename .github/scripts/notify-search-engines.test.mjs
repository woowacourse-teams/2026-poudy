import assert from "node:assert/strict";
import test from "node:test";

import {
  changedEntries,
  changedSitemaps,
  chunks,
  sitemapEntries,
  sitemapLocations,
} from "./notify-search-engines.mjs";

const PAGES = "https://poudy.site/sitemap-pages.xml";
const PRODUCTS = "https://poudy.site/sitemap-products.xml";

test("사이트맵 인덱스에서 하위 사이트맵 주소를 읽는다", () => {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://poudy.site/sitemap-pages.xml</loc></sitemap><sitemap><loc>https://poudy.site/sitemap-products.xml?a=1&amp;b=2</loc></sitemap></sitemapindex>';

  assert.deepEqual(sitemapLocations(xml), [
    "https://poudy.site/sitemap-pages.xml",
    "https://poudy.site/sitemap-products.xml?a=1&b=2",
  ]);
});

test("URL 과 lastmod 를 읽고, lastmod 가 없으면 빈 값으로 둔다", () => {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://poudy.site/products/1</loc><lastmod>2026-10-13</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url><url>\n  <loc>https://poudy.site/</loc>\n</url></urlset>';

  assert.deepEqual(sitemapEntries(xml, PRODUCTS), [
    {
      url: "https://poudy.site/products/1",
      lastmod: "2026-10-13",
      sitemap: PRODUCTS,
    },
    { url: "https://poudy.site/", lastmod: "", sitemap: PRODUCTS },
  ]);
});

test("새로 생기거나 lastmod 가 바뀐 URL 만 고른다", () => {
  const previous = {
    "https://poudy.site/products/1": "2026-10-13",
    "https://poudy.site/products/2": "2026-10-13",
    "https://poudy.site/products/3": "2026-10-13",
  };
  const entries = [
    {
      url: "https://poudy.site/products/1",
      lastmod: "2026-10-13",
      sitemap: PRODUCTS,
    },
    {
      url: "https://poudy.site/products/2",
      lastmod: "2026-10-20",
      sitemap: PRODUCTS,
    },
    {
      url: "https://poudy.site/products/4",
      lastmod: "2026-10-20",
      sitemap: PRODUCTS,
    },
  ];

  assert.deepEqual(
    changedEntries(previous, entries).map(({ url }) => url),
    ["https://poudy.site/products/2", "https://poudy.site/products/4"],
  );
});

test("이전 기록이 없으면 전부 고른다", () => {
  const entries = [
    { url: "https://poudy.site/", lastmod: "2026-10-15", sitemap: PAGES },
    { url: "https://poudy.site/brands", lastmod: "", sitemap: PAGES },
  ];

  assert.deepEqual(changedEntries({}, entries), entries);
});

test("바뀐 URL 이 든 사이트맵을 한 번씩만 고른다", () => {
  const entries = [
    { url: "https://poudy.site/", lastmod: "2026-10-15", sitemap: PAGES },
    {
      url: "https://poudy.site/products/1",
      lastmod: "2026-10-20",
      sitemap: PRODUCTS,
    },
    { url: "https://poudy.site/brands", lastmod: "2026-10-20", sitemap: PAGES },
  ];

  assert.deepEqual(changedSitemaps(entries), [PAGES, PRODUCTS]);
  assert.deepEqual(changedSitemaps([]), []);
});

test("요청 한 번에 담을 수 있는 수로 나눈다", () => {
  assert.deepEqual(chunks([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunks([], 2), []);
});
