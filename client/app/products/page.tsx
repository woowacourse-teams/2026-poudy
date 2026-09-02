import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductList } from "@/components/product/ProductList";
import { TopBar } from "@/components/ui/TopBar";
import { fetchBrands, fetchCategories, fetchExcludeCodes } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "조건 일치 제품",
  alternates: { canonical: "/products" },
  robots: { index: false, follow: true },
};

// 조건 조합이 사실상 무한해서 미리 만들지 않는다. 색인 대상도 아니다.
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  // 필터 시트에 쓰는 목록은 거의 바뀌지 않아 서버에서 미리 받아 넘긴다.
  const [categories, brands, excludeCodes] = await Promise.all([fetchCategories(), fetchBrands(), fetchExcludeCodes()]);

  return (
    <>
      <TopBar title="조건 일치 제품" variant="sub" />

      {/* useSearchParams 를 쓰는 목록은 클라이언트에서 그린다. */}
      <Suspense fallback={<p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>}>
        <ProductList categories={categories.items} brands={brands.items} excludeCodes={excludeCodes.items} />
      </Suspense>
    </>
  );
}
