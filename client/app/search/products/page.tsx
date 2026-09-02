import type { Metadata } from "next";
import { Suspense } from "react";

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
      {/* 검색어를 주소에서 읽으므로 정적으로 미리 만든 껍데기 안에서 기다린다. */}
      <Suspense>
        <ProductSearchPanel />
      </Suspense>
    </main>
  );
}
