import { CRAWL_CASES, isAllowed, parseRobots } from "./robots-rules.mjs";

// 배포된 운영 사이트를 검색로봇의 눈으로 확인한다. 코드 테스트가 통과해도 배포가 늦거나 빠지면 운영은 옛 상태다.
const site = new URL(process.env.POUDY_VERIFY_SITE || "https://poudy.site").origin;
const userAgents = {
  Googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  Yeti: "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
};
// 사이트맵 전부를 열면 운영에 수천 건을 보낸다. 페이지 사이트맵은 모두, 제품·성분은 앞에서 몇 개만 본다.
const DETAIL_SAMPLE_SIZE = 5;

const failures = [];
const fail = (message) => failures.push(message);

const get = async (path, userAgent = userAgents.Googlebot) => {
  const response = await fetch(new URL(path, site), { headers: { "User-Agent": userAgent }, redirect: "manual" });
  return { status: response.status, text: await response.text() };
};

const robotsMetaOf = (html) =>
  [...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map(([, content]) => content);
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
const locsOf = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc]) => loc.replaceAll("&amp;", "&"));

const checkMissingDetails = async () => {
  const paths = [
    "/brands/999999999",
    "/brands/abc",
    "/categories/999999999",
    "/products/999999999",
    "/ingredients/999999999",
  ];
  const results = await Promise.all(
    paths.flatMap((path) =>
      Object.entries(userAgents).map(async ([bot, userAgent]) => ({ path, bot, ...(await get(path, userAgent)) })),
    ),
  );
  results
    .filter(({ status }) => status !== 404)
    .forEach(({ path, bot, status }) => fail(`${path} (${bot}) 응답 ${status}, 기대 404`));
};

const checkRobots = async () => {
  const { status, text } = await get("/robots.txt");
  if (status !== 200) {
    fail(`robots.txt 응답 ${status}, 기대 200`);
    return;
  }

  const rules = parseRobots(text);
  CRAWL_CASES.allowed
    .filter((path) => !isAllowed(rules, path))
    .forEach((path) => fail(`robots.txt 가 ${path} 수집을 막습니다.`));
  CRAWL_CASES.blocked
    .filter((path) => isAllowed(rules, path))
    .forEach((path) => fail(`robots.txt 가 ${path} 수집을 허용합니다.`));
};

const checkCrawlableListIsNoindex = async () => {
  const path = CRAWL_CASES.allowed.find((candidate) => candidate.startsWith("/products?"));
  const { status, text } = await get(path);
  if (status !== 200) fail(`${path} 응답 ${status}, 기대 200`);
  if (!robotsMetaOf(text).some((content) => content.includes("noindex")))
    fail(`${path} 에 noindex 가 없습니다. 수집만 열고 색인은 막아야 합니다.`);
};

const checkSitemapPage = async (loc) => {
  const { status, text } = await get(new URL(loc).pathname);
  if (status !== 200) {
    fail(`사이트맵의 ${loc} 응답 ${status}, 기대 200`);
    return;
  }

  // 홈은 canonical 이 끝의 / 없이 나온다. 같은 주소라 URL 로 맞춰 비교한다.
  const canonical = canonicalOf(text);
  if (!canonical || new URL(canonical, site).href !== new URL(loc).href)
    fail(`사이트맵의 ${loc} canonical 이 ${canonical ?? "없음"} 입니다.`);
  if (robotsMetaOf(text).some((content) => content.includes("noindex"))) fail(`사이트맵의 ${loc} 가 noindex 입니다.`);
};

const checkSitemaps = async () => {
  const index = await get("/sitemap.xml");
  if (index.status !== 200) {
    fail(`sitemap.xml 응답 ${index.status}, 기대 200`);
    return;
  }

  const sitemaps = await Promise.all(locsOf(index.text).map(async (loc) => ({ loc, ...(await get(loc)) })));
  sitemaps.filter(({ status }) => status !== 200).forEach(({ loc, status }) => fail(`${loc} 응답 ${status}, 기대 200`));

  const locs = sitemaps.flatMap(({ loc, text }) => {
    const urls = locsOf(text);
    if (loc.endsWith("/sitemap-pages.xml")) return urls;
    return urls.slice(0, DETAIL_SAMPLE_SIZE);
  });
  if (!locs.includes(`${site}/about`)) fail("페이지 사이트맵에 /about 이 없습니다.");
  locs
    .filter((loc) => new URL(loc).origin !== site)
    .forEach((loc) => fail(`사이트맵의 ${loc} 가 대표 도메인이 아닙니다.`));

  // 운영에 부담을 주지 않도록 차례로 연다.
  await locs.reduce((previous, loc) => previous.then(() => checkSitemapPage(loc)), Promise.resolve());
  console.log(`사이트맵 URL ${locs.length}개를 열어 보았습니다.`);
};

await checkMissingDetails();
await checkRobots();
await checkCrawlableListIsNoindex();
await checkSitemaps();

if (failures.length > 0) {
  failures.forEach((message) => console.log(`::error::${message}`));
  process.exit(1);
}
console.log(`${site} 의 상태 코드, robots.txt, 사이트맵이 기대와 같습니다.`);
