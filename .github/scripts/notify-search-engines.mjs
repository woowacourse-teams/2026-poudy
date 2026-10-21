import { appendFile, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const INDEXNOW_ENDPOINT = "https://searchadvisor.naver.com/indexnow";
const SEARCH_CONSOLE_API = "https://www.googleapis.com/webmasters/v3/sites";
const URLS_PER_REQUEST = 10000;
const KEY_FILE = /^([0-9a-f]{32})\.txt$/;

const unescapeXml = (value) =>
  value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");

const tagValue = (xml, name) =>
  xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]?.trim();

export function sitemapLocations(xml) {
  return [...xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)].map(([, body]) =>
    unescapeXml(tagValue(body, "loc")),
  );
}

export function sitemapEntries(xml, sitemap) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => ({
    url: unescapeXml(tagValue(body, "loc")),
    lastmod: tagValue(body, "lastmod") ?? "",
    sitemap,
  }));
}

/** 이전 실행 때와 견줘 새로 생기거나 lastmod 가 바뀐 URL. 이전 기록이 없으면 전부다. */
export function changedEntries(previous, entries) {
  return entries.filter(({ url, lastmod }) => previous[url] !== lastmod);
}

export function changedSitemaps(entries) {
  return [...new Set(entries.map(({ sitemap }) => sitemap))];
}

export function chunks(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

async function indexNowKey() {
  const keys = (await readdir(path.join(root, "client/public")))
    .map((name) => name.match(KEY_FILE)?.[1])
    .filter(Boolean);
  if (keys.length !== 1)
    throw new Error(
      `client/public 에서 IndexNow 키 파일을 하나로 찾지 못했습니다: ${keys.length}개`,
    );
  return keys[0];
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "error" });
  if (!response.ok) throw new Error(`${url} 응답이 ${response.status} 입니다.`);
  return response.text();
}

async function keyServed(siteUrl, key) {
  const response = await fetch(new URL(`/${key}.txt`, siteUrl), {
    redirect: "error",
  });
  if (!response.ok) return false;
  return (await response.text()).trim() === key;
}

async function siteEntries(siteUrl) {
  const locations = sitemapLocations(
    await fetchText(new URL("/sitemap.xml", siteUrl)),
  );
  if (locations.length === 0)
    throw new Error("사이트맵 인덱스에 하위 사이트맵이 없습니다.");
  const sitemaps = await Promise.all(
    locations.map(async (location) => ({
      location,
      entries: sitemapEntries(await fetchText(location), location),
    })),
  );
  const empty = sitemaps.find(({ entries }) => entries.length === 0);
  if (empty) throw new Error(`${empty.location} 에 URL 이 없습니다.`);
  const entries = sitemaps.flatMap(({ entries }) => entries);
  const foreign = entries.find(({ url }) => new URL(url).host !== siteUrl.host);
  if (foreign)
    throw new Error(`사이트 밖 URL 이 사이트맵에 있습니다: ${foreign.url}`);
  return entries;
}

async function readSnapshot(file) {
  return readFile(file, "utf8").then(JSON.parse, (error) => {
    if (error.code === "ENOENT") return {};
    throw error;
  });
}

async function submitIndexNow(siteUrl, key, urls) {
  const responses = await Promise.all(
    chunks(urls, URLS_PER_REQUEST).map((urlList) =>
      fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: siteUrl.host,
          key,
          keyLocation: new URL(`/${key}.txt`, siteUrl).toString(),
          urlList,
        }),
      }),
    ),
  );
  const failed = responses.find(
    ({ status }) => status !== 200 && status !== 202,
  );
  if (failed)
    throw new Error(
      `IndexNow 가 ${failed.status} 로 거절했습니다: ${await failed.text()}`,
    );
}

async function submitSitemaps(siteUrl, accessToken, sitemaps) {
  const property = encodeURIComponent(`sc-domain:${siteUrl.hostname}`);
  const responses = await Promise.all(
    sitemaps.map((sitemap) =>
      fetch(
        `${SEARCH_CONSOLE_API}/${property}/sitemaps/${encodeURIComponent(sitemap)}`,
        { method: "PUT", headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    ),
  );
  const failed = responses.find(({ ok }) => !ok);
  if (failed)
    throw new Error(
      `Search Console 이 사이트맵 제출을 ${failed.status} 로 거절했습니다: ${await failed.text()}`,
    );
}

async function saveSnapshot(file, entries) {
  await writeFile(
    file,
    JSON.stringify(
      Object.fromEntries(entries.map(({ url, lastmod }) => [url, lastmod])),
    ),
  );
}

async function summarize(lines) {
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
}

async function main() {
  const siteUrl = new URL(process.env.SITE_URL);
  const snapshot = process.env.SNAPSHOT;
  const dryRun = process.env.DRY_RUN === "true";
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  const key = await indexNowKey();
  const entries = await siteEntries(siteUrl);
  const changed = changedEntries(await readSnapshot(snapshot), entries);
  const urls = changed.map(({ url }) => url);
  const sitemaps = changedSitemaps(changed);
  const lines = [
    "### 검색 엔진 알림",
    "",
    `- 사이트맵 URL: ${entries.length}개`,
    `- 바뀐 URL: ${urls.length}개`,
    ...urls.slice(0, 20).map((url) => `  - ${url}`),
    `- 바뀐 사이트맵: ${sitemaps.join(", ") || "없음"}`,
  ];

  if (dryRun) {
    await summarize([...lines, "- 시험 실행이라 보내지 않았습니다."]);
    return;
  }
  if (urls.length === 0) {
    await saveSnapshot(snapshot, entries);
    await summarize(lines);
    return;
  }

  const results = [];
  if (accessToken) {
    await submitSitemaps(siteUrl, accessToken, sitemaps);
    results.push("- 구글: Search Console 에 바뀐 사이트맵을 제출했습니다.");
  } else {
    results.push("- 구글: 인증 정보가 없어 사이트맵을 제출하지 않았습니다.");
    console.log("::warning::구글 인증 정보가 없어 사이트맵 제출을 건너뜁니다.");
  }

  if (!(await keyServed(siteUrl, key))) {
    await summarize([
      ...lines,
      ...results,
      `- 네이버: 운영에 키 파일 /${key}.txt 가 아직 없어 보내지 않았습니다. 다음 실행에서 다시 보냅니다.`,
    ]);
    console.log("::warning::운영에 IndexNow 키 파일이 없어 건너뜁니다.");
    return;
  }
  await submitIndexNow(siteUrl, key, urls);
  await saveSnapshot(snapshot, entries);
  await summarize([
    ...lines,
    ...results,
    "- 네이버: IndexNow 로 바뀐 URL 을 보냈습니다.",
  ]);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
