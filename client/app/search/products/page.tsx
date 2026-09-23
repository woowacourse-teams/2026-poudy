import type { Metadata } from "next";
import { Suspense } from "react";

import { PopularKeywords } from "@/components/home/PopularKeywords";
import { ProductSearchPanel, ProductSearchPanelFallback } from "@/components/search/ProductSearchPanel";
import { fetchSearchKeywordRankings } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "제품 검색",
  description: "제품명이나 브랜드로 화장품과 전성분 정보를 찾아보세요.",
  alternates: { canonical: "/search/products" },
};

/** 순위를 받지 못해도 검색은 된다. 그 자리만 비운다. */
const loadKeywords = () =>
  fetchSearchKeywordRankings()
    .then((response) => response.items)
    .catch(() => []);

/** S02 제품명 검색 탭. */
export default async function ProductSearchPage() {
  const keywords = await loadKeywords();
  const popular = <PopularKeywords items={keywords} />;

  /*
   * 검색어를 주소에서 읽으므로 미리 만든 껍데기 안에서 기다린다. 기다리는 동안에는 검색어가
   * 없을 때의 화면을 그대로 그려, 크롤러와 스크립트가 늦은 사람도 인기 검색어를 본다.
   */
  return (
    <main className="flex-1">
      <Suspense fallback={<ProductSearchPanelFallback>{popular}</ProductSearchPanelFallback>}>
        <ProductSearchPanel>{popular}</ProductSearchPanel>
      </Suspense>
    </main>
  );
}
