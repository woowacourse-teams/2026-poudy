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
  /*
   * 인기 검색어를 보러 들어오는 화면이라 `panel` 로 둔다. 처음부터 펼쳐 두고, 목록이
   * 자리를 차지해 최근 검색을 아래로 밀어낸다. 띄워 둔 채로 열어 두면 최근 검색이 첫
   * 화면부터 가려진다. 홈은 지나가는 길에 한 줄만 스치는 것이라 기본값을 그대로 쓴다.
   */
  const popular = <PopularKeywords items={keywords} variant="panel" />;

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
