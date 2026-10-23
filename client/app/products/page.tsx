import type { Metadata } from "next";

import { ProductsEmpty } from "./empty";

import { ProductList } from "@/components/product/ProductList";
import { ProductListSkeleton } from "@/components/product/ProductListSkeleton";
import { StreamBoundary } from "@/components/ui/StreamBoundary";
import { TopBar } from "@/components/ui/TopBar";
import { productEntryPointOf, type ProductEntryPoint } from "@/lib/analytics/events";
import { fetchExcludeCodes } from "@/lib/api/products";
import { fetchProductsForRequest as fetchProducts } from "@/lib/api/products.server";
import { resolveLinkConflicts } from "@/lib/domain/conflict";
import { FIRST_PAGE, parseFilter } from "@/lib/domain/filter";
import { requireMyFilterSession } from "@/lib/navigation/my-filter-session";
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
  const entries = await searchParams;
  /*
   * 링크로 들어온 조건이 부딪히면 클라이언트가 원하는 성분 쪽을 빼고 보여 준다(명세 S36). 첫 장도 같은 조건으로 받아야
   * 클라이언트가 그대로 이어 쓴다. 부딪힌 조건을 그대로 보내면 서버가 400 으로 거절한다.
   */
  const excludeCodes = await fetchExcludeCodes();
  const { filter } = resolveLinkConflicts(
    parseFilter(toSearchParams(entries)),
    new Map(excludeCodes.items.map((code) => [code.code, code.ingredients.map((ingredient) => ingredient.id)])),
  );
  const key = productPagesKey(filter);
  const requestedEntryPoint = productEntryPointOf(entries.from);
  const entryPoint: ProductEntryPoint | undefined = ["popular_keyword", "skin_type"].includes(requestedEntryPoint)
    ? requestedEntryPoint
    : undefined;

  // 받지 못해도 화면은 뜬다. 클라이언트가 다시 받는다.
  const initialPage = await fetchProducts(filter)
    .then((response) => ({ key, response }))
    .catch(() => undefined);

  return (
    <ProductList
      excludeCodes={excludeCodes.items}
      initialPage={initialPage}
      entryPoint={entryPoint}
      stickyChips="products"
      empty={<ProductsEmpty />}
    />
  );
}

export default async function ProductsPage(props: PageProps<"/products">) {
  const params = toSearchParams(await props.searchParams);
  await requireMyFilterSession("/products", params);
  const filter = parseFilter(params);
  // 첫 장만 스트리밍한다. 뒤쪽 장은 목록까지 다 그린 뒤 보내므로 없는 장이면 404 를 낼 수 있다.
  const stream = filter.page === FIRST_PAGE;
  if (!stream) await requireProductPage(filter);

  return (
    <>
      {/* 제목은 고정된 말이라 기다릴 것이 없다. 목록만 채워지기를 기다린다. */}
      <TopBar title="조건 일치 제품" variant="sub" edge={false} />

      <StreamBoundary stream={stream} fallback={<ProductListSkeleton stickyChips="products" />}>
        <MatchedProducts searchParams={props.searchParams} />
      </StreamBoundary>
    </>
  );
}
