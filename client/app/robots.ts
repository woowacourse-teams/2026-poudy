import type { MetadataRoute } from "next";

import { absoluteUrl, searchEnginesAllowed, siteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  if (!searchEnginesAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      // 홈이 거는 성분 제외 링크는 조건이 고정되어 있어 따라갈 수 있게 둔다.
      // 조건을 조합해 끝없이 늘어나는 나머지 /products 주소는 아래에서 막는다.
      allow: ["/", "/products/", "/products?excludeCodes="],
      // 검색 엔진에는 공개 화면만 제공하고, 브라우저가 사용하는 원본 API는
      // 협조적인 크롤러가 직접 순회하지 않도록 한다. robots.txt를 따르지 않는
      // 수집기는 별도의 rate limit·탐지 정책 대상이다.
      // /share 는 앱이 공유 텍스트를 들고 오는 경유 경로라 색인할 내용이 없다.
      disallow: ["/api/", "/products", "/share/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl().origin,
  };
}
