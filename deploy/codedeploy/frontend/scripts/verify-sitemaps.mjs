import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const paths = ["/sitemap-pages.xml", "/sitemap-products.xml", "/sitemap-ingredients.xml"];

export const entriesOf = (xml) => {
  assert.match(xml, /<urlset\b/, "사이트맵이 urlset XML이 아닙니다.");
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const lastmod = entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    assert.ok(loc && lastmod, "사이트맵 URL 또는 수정일이 없습니다.");
    return [loc, lastmod];
  });
  assert.ok(entries.length, "사이트맵이 비었습니다.");
  assert.equal(new Set(entries.map(([loc]) => loc)).size, entries.length, "중복 URL이 있습니다.");
  return entries.sort(([a], [b]) => a.localeCompare(b));
};

export const verifySitemaps = async (origin, published) => {
  for (const path of paths) {
    const read = async (base) => {
      const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(90000), redirect: "error" });
      assert.equal(response.status, 200, `${path}: ${base} 응답이 200이 아닙니다.`);
      return entriesOf(await response.text());
    };
    const expected = await read(origin);
    const actual = await read(published);
    assert.deepEqual(actual, expected, `${path}: 앱 원본과 공개 사이트맵의 URL·수정일이 다릅니다.`);
    console.log(`${path}: 원본·공개 URL ${actual.length}개와 수정일 일치`);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [origin, published] = process.argv.slice(2);
  assert.ok(origin && published, "사용법: node verify-sitemaps.mjs <앱 원본 URL> <공개 URL>");
  await verifySitemaps(origin, published);
}
