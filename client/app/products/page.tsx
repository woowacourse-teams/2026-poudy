import type { Metadata } from "next";

import { ProductList } from "@/components/product/ProductList";
import { ProductListSkeleton } from "@/components/product/ProductListSkeleton";
import { StreamBoundary } from "@/components/ui/StreamBoundary";
import { TopBar } from "@/components/ui/TopBar";
import { fetchExcludeCodes, fetchProducts } from "@/lib/api/products";
import { FIRST_PAGE, parseFilter } from "@/lib/domain/filter";
import { requireProductPage } from "@/lib/navigation/product-page-range";
import { type SearchParams, toSearchParams } from "@/lib/navigation/search-params";
import { productPagesKey } from "@/lib/storage/product-pages-cache";

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
  const key = productPagesKey(filter);

  /*
   * 첫 장은 기다리지 않고 약속만 넘긴다. 조건 줄은 제외 성분군만 있으면 그릴 수 있어
   * 제품 조회보다 먼저 나가고, 목록 자리만 도착을 기다린다.
   * 받지 못해도 화면은 뜬다. 클라이언트가 다시 받는다.
   */
  const initialPagePromise = fetchProducts(filter)
    .then((response) => ({ key, response }))
    .catch(() => undefined);

  const [excludeCodes, initialPage] = await Promise.all([fetchExcludeCodes(), initialPagePromise]);

  return <ProductList excludeCodes={excludeCodes.items} initialPage={initialPage} />;
}

export default async function ProductsPage(props: PageProps<"/products">) {
  const filter = parseFilter(toSearchParams(await props.searchParams));
  // 첫 장만 스트리밍한다. 뒤쪽 장은 목록까지 다 그린 뒤 보내므로 없는 장이면 404 를 낼 수 있다.
  const stream = filter.page === FIRST_PAGE;
  if (!stream) await requireProductPage(filter);

  return (
    <>
      {/* 제목은 고정된 말이라 기다릴 것이 없다. 목록만 채워지기를 기다린다. */}
      <TopBar title="조건 일치 제품" variant="sub" />

      <StreamBoundary stream={stream} fallback={<ProductListSkeleton />}>
        <MatchedProducts searchParams={props.searchParams} />
      </StreamBoundary>
    </>
  );
}
