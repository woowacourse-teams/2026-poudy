import type { Metadata } from "next";

import { ProductSearchPanel } from "@/components/search/ProductSearchPanel";

export const metadata: Metadata = {
  title: "제품 검색",
  description: "제품명이나 브랜드로 화장품과 전성분 정보를 찾아보세요.",
  alternates: { canonical: "/search/products" },
};

/** S02 제품명 검색 탭. */
export default function ProductSearchPage() {
  return (
    <main className="flex-1">
      <ProductSearchPanel />
    </main>
  );
}
