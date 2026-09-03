import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductList } from "@/components/product/ProductList";
import { TopBar } from "@/components/ui/TopBar";
import { fetchExcludeCodes } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "조건 일치 제품",
  alternates: { canonical: "/products" },
  robots: { index: false, follow: true },
};

// 조건은 클라이언트가 읽으므로 서버가 그리는 껍데기는 하나뿐이다.
// 필터 재료만 하루에 한 번 다시 받는다.
export const revalidate = 86400;

export default async function ProductsPage() {
  // 필터 시트에 쓰는 목록은 거의 바뀌지 않아 서버에서 미리 받아 넘긴다.
  const excludeCodes = await fetchExcludeCodes();

  return (
    <>
      <TopBar title="조건 일치 제품" variant="sub" />

      {/* useSearchParams 를 쓰는 목록은 클라이언트에서 그린다. */}
      <Suspense fallback={<p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>}>
        <ProductList excludeCodes={excludeCodes.items} />
      </Suspense>
    </>
  );
}
