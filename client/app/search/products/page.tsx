import type { Metadata } from "next";

import { ProductSearchPanel } from "@/components/search/ProductSearchPanel";

export const metadata: Metadata = {
  title: "제품명 검색",
};

/** S02 제품명 검색 탭. */
export default function ProductSearchPage() {
  return (
    <main className="flex-1">
      <ProductSearchPanel />
    </main>
  );
}
