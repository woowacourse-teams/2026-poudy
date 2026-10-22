/**
 * robots.txt 규칙이 주소를 허용하는지 RFC 9309 대로 판정한다. 네이버와 Google 이 모두 이 표준을 따른다.
 * 가장 길게 맞는 규칙이 이기고, 길이가 같으면 Allow 가 이긴다. `*` 는 아무 글자나, 끝의 `$` 는 주소 끝을 뜻한다.
 *
 * 테스트(lib/seo/routes.test.ts)는 코드의 규칙을, 운영 검증(verify-production-seo.mjs)은 배포된 robots.txt 를
 * 같은 판정으로 본다.
 *
 * @typedef {{ readonly allow: readonly string[]; readonly disallow: readonly string[] }} RobotsRules
 */

/**
 * 열어야 하는 주소와 막아야 하는 주소. 성분 상세의 '포함 제품 모두 보기' 하나만 새로 열고,
 * 순서를 바꾸거나 조건·페이지·정렬·추적값을 더한 조합은 계속 막혀야 한다.
 */
export const CRAWL_CASES = {
  allowed: [
    "/",
    "/about",
    "/products/1",
    "/brands/1",
    "/categories/1",
    "/ingredients/2",
    "/curations/1",
    "/_next/static/chunks/main.js",
    "/products?includeIngredientIds=2",
  ],
  blocked: [
    "/products",
    "/products?keyword=%ED%86%A0%EB%84%88",
    "/products?includeIngredientIds=2&includeIngredientIds=3",
    "/products?includeIngredientIds=2,3",
    "/products?includeIngredientIds=2%2C3",
    "/products?includeIngredientIds=2%2c3",
    "/products?keyword=x&includeIngredientIds=2",
    "/products?categoryIds=1&includeIngredientIds=2",
    "/products?includeIngredientIds=2&excludeIngredientIds=3",
    "/products?includeIngredientIds=2&page=2",
    "/products?includeIngredientIds=2&sort=PRICE_ASC",
    "/products?includeIngredientIds=2&from=ingredient",
    "/products?includeIngredientIds=2&utm_source=x",
    "/products?page=2&includeIngredientIds=2",
    "/api/products?includeIngredientIds=2",
    "/share/abc",
  ],
};

/** @param {string} text */
const escapeRegExp = (text) => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

/** @param {string} pattern */
const patternRegExp = (pattern) => {
  const source = pattern.replace(/\$$/, "").split("*").map(escapeRegExp).join(".*");
  if (pattern.endsWith("$")) return new RegExp(`^${source}$`);
  return new RegExp(`^${source}`);
};

/**
 * @param {readonly string[]} patterns
 * @param {string} path
 */
const longestMatch = (patterns, path) =>
  Math.max(
    -1,
    ...patterns.filter((pattern) => pattern && patternRegExp(pattern).test(path)).map((pattern) => pattern.length),
  );

/**
 * @param {RobotsRules} rules
 * @param {string} path 경로와 쿼리. 예: `/products?includeIngredientIds=2`
 */
export const isAllowed = (rules, path) => longestMatch(rules.allow, path) >= longestMatch(rules.disallow, path);

/**
 * 모든 로봇(`User-Agent: *`)에 걸린 규칙만 읽는다. 우리 robots.txt 는 그 묶음 하나뿐이다.
 *
 * @param {string} text
 * @returns {RobotsRules}
 */
export const parseRobots = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      return { field: line.slice(0, colon).trim().toLowerCase(), value: line.slice(colon + 1).trim() };
    });
  const valuesOf = (/** @type {string} */ field) =>
    lines.filter((line) => line.field === field).map((line) => line.value);

  if (!valuesOf("user-agent").includes("*")) throw new Error("robots.txt 에 User-Agent: * 묶음이 없습니다.");
  return { allow: valuesOf("allow"), disallow: valuesOf("disallow") };
};
