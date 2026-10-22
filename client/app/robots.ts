import type { MetadataRoute } from "next";

import { absoluteUrl, searchEnginesAllowed, siteUrl } from "@/lib/seo/site";

const SINGLE_INGREDIENT_PRODUCTS = "/products?includeIngredientIds=";

/*
 * Allow 는 접두사라 그대로 두면 뒤에 붙는 조건까지 함께 열린다. 더 긴 규칙이 이기므로
 * 다른 파라미터(&)와 쉼표로 이은 복수 성분을 각각 Disallow 로 덮는다.
 * 필터는 성분 여러 개를 반복 키로도, 쉼표로도 읽는다(lib/domain/filter.ts).
 */
const SINGLE_INGREDIENT_COMBINATIONS = ["&", ",", "%2C", "%2c"].map(
  (separator) => `${SINGLE_INGREDIENT_PRODUCTS}*${separator}`,
);

export default function robots(): MetadataRoute.Robots {
  if (!searchEnginesAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      // 홈이 거는 성분 제외 링크는 조건이 고정되어 있어 따라갈 수 있게 둔다.
      // 조건을 조합해 끝없이 늘어나는 나머지 /products 주소는 아래에서 막는다.
      // 성분 상세의 '포함 제품 모두 보기'는 성분 하나만 건 목록이라 제품으로 이어지는 길로 열어 둔다.
      // 목록 자체는 noindex 라 수집만 허용하고 색인은 하지 않는다.
      allow: ["/", "/products/", "/products?excludeCodes=", SINGLE_INGREDIENT_PRODUCTS],
      // 검색 엔진에는 공개 화면만 제공하고, 브라우저가 사용하는 원본 API는
      // 협조적인 크롤러가 직접 순회하지 않도록 한다. robots.txt를 따르지 않는
      // 수집기는 별도의 rate limit·탐지 정책 대상이다.
      // /share 는 앱이 공유 텍스트를 들고 오는 경유 경로라 색인할 내용이 없다.
      disallow: ["/api/", "/products", "/share/", ...SINGLE_INGREDIENT_COMBINATIONS],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl().origin,
  };
}
