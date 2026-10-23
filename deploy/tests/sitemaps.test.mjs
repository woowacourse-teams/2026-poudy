import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { entriesOf, verifySitemaps } from "../codedeploy/frontend/scripts/verify-sitemaps.mjs";

const xml = (date = "2026-10-23") => `<urlset><url><loc>https://poudy.site/products/1</loc><lastmod>${date}</lastmod></url></urlset>`;

test("순서와 무관하게 URL·수정일을 비교하고 중복·빈 XML을 거절한다", () => {
  assert.deepEqual(entriesOf(xml()), [["https://poudy.site/products/1", "2026-10-23"]]);
  assert.throws(() => entriesOf("<html>error</html>"));
  assert.throws(() => entriesOf("<urlset></urlset>"));
  assert.throws(() => entriesOf(xml().replace("</urlset>", xml().match(/<url>.*<\/url>/)[0] + "</urlset>")));
});

test("HTTP 200인 오래된 캐시도 배포 검증에서 실패한다", async (t) => {
  let stale = false;
  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/xml" });
    res.end(xml());
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  // 두 실제 서버를 사용해 URL 경로가 같은 원본·공개 응답의 차이를 재현한다.
  const published = createServer((req, res) => { res.writeHead(200); res.end(xml(stale ? "2026-10-09" : "2026-10-23")); });
  await new Promise((resolve) => published.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => published.close(resolve)));
  const publicBase = `http://127.0.0.1:${published.address().port}`;
  await verifySitemaps(base, publicBase);
  stale = true;
  await assert.rejects(verifySitemaps(base, publicBase), /수정일이 다릅니다/);
});
