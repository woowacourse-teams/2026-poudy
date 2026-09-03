import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductList } from "@/components/product/ProductList";
import { ProductListSkeleton } from "@/components/product/ProductListSkeleton";
import { TopBar } from "@/components/ui/TopBar";
import { fetchExcludeCodes, fetchProducts } from "@/lib/api/products";
import { parseFilter } from "@/lib/domain/filter";
import { type SearchParams, toSearchParams } from "@/lib/navigation/search-params";

export const metadata: Metadata = {
  title: "조건 일치 제품",
  alternates: { canonical: "/products" },
  robots: { index: false, follow: true },
};

/*
 * 조건이 주소에 붙어 어차피 요청마다 그려지지만, 그 사실을 코드로 남긴다.
 * 카탈로그 조회의 fetch 캐시는 이 설정과 무관하게 그대로 동작한다.
 */
export const dynamic = "force-dynamic";

/** 필터 재료와 첫 장. 제목은 조건과 무관해 이미 떠 있다. */
async function MatchedProducts({ searchParams }: { readonly searchParams: SearchParams }) {
  const filter = parseFilter(toSearchParams(await searchParams));
  const key = JSON.stringify({ ...filter, page: 0 });

  /*
   * 첫 장은 기다리지 않고 약속만 넘긴다. 조건 줄은 제외 성분군만 있으면 그릴 수 있어
   * 제품 조회보다 먼저 나가고, 목록 자리만 도착을 기다린다.
   * 받지 못해도 화면은 뜬다. 클라이언트가 다시 받는다.
   */
  const initialPagePromise = fetchProducts({ ...filter, page: 0 })
    .then((response) => ({ key, response }))
    .catch(() => undefined);

  const [excludeCodes, initialPage] = await Promise.all([fetchExcludeCodes(), initialPagePromise]);

  return <ProductList excludeCodes={excludeCodes.items} initialPage={initialPage} />;
}

export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <>
      {/* 제목은 고정된 말이라 기다릴 것이 없다. 목록만 채워지기를 기다린다. */}
      <TopBar title="조건 일치 제품" variant="sub" />

      <Suspense fallback={<ProductListSkeleton />}>
        <MatchedProducts searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
