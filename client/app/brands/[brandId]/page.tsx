import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { BrandHero } from "./brand-hero";
import { BrandBarTitle, BrandTitleScope } from "./brand-title";
import { BrandProductsEmpty } from "./empty";

import { DirectoryTopBar } from "@/components/directory/DirectoryTopBar";
import { ProductList } from "@/components/product/ProductList";
import { ProductListSkeleton } from "@/components/product/ProductListSkeleton";
import { JsonLd } from "@/components/seo/JsonLd";
import { StreamBoundary } from "@/components/ui/StreamBoundary";
import { ApiError } from "@/lib/api/client";
import { fetchBrand, fetchExcludeCodes } from "@/lib/api/products";
import { fetchProductsForRequest as fetchProducts } from "@/lib/api/products.server";
import { FIRST_PAGE, parseFilter } from "@/lib/domain/filter";
import { requireMyFilterSession } from "@/lib/navigation/my-filter-session";
import { requireProductPage } from "@/lib/navigation/product-page-range";
import { type SearchParams, toSearchParams } from "@/lib/navigation/search-params";
import { directoryPageContent, OPEN_GRAPH_BASE, pagedCanonical } from "@/lib/seo/metadata";
import { breadcrumbList, collectionPageStructuredData } from "@/lib/seo/structured-data";
import { productPagesKey } from "@/lib/storage/product-pages-cache";

const load = cache(async (raw: string) => {
  const brandId = Number(raw);
  if (!Number.isInteger(brandId)) notFound();

  try {
    return await fetchBrand(brandId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

/*
 * 조건이 주소에 붙어 어차피 요청마다 그려지지만, 그 사실을 코드로 남긴다.
 * 카탈로그 조회의 fetch 캐시는 이 설정과 무관하게 그대로 동작한다.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/brands/[brandId]">): Promise<Metadata> {
  const { brandId } = await props.params;
  const urlFilter = parseFilter(toSearchParams(await props.searchParams));
  const { page } = urlFilter;
  // 조회에 실패해도 canonical 은 남긴다. 비워 두면 필터가 붙은 주소가 저마다 원본 행세를 한다.
  const canonical = pagedCanonical(`/brands/${brandId}`, page);

  try {
    const brand = await fetchBrand(Number(brandId));
    const products = await fetchProducts({ ...urlFilter, brandIds: [brand.id] }).catch(() => undefined);
    const { title, description } = directoryPageContent("brand", brand.name, products?.items);
    const image = `/brands/${brandId}/opengraph-image`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { ...OPEN_GRAPH_BASE, title, description, url: canonical, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  } catch {
    return { alternates: { canonical } };
  }
}

/** 필터 재료와 첫 장. 브랜드 소개를 막지 않고 별도 경계에서 스트리밍한다. */
async function BrandProducts({
  params,
  searchParams,
}: {
  readonly params: PageProps<"/brands/[brandId]">["params"];
  readonly searchParams: SearchParams;
}) {
  const { brandId: raw } = await params;
  const brand = await load(raw);
  const brandIds = [brand.id];
  const urlFilter = parseFilter(toSearchParams(await searchParams));
  const filter = { ...urlFilter, brandIds };
  const key = productPagesKey(filter);

  /*
   * 첫 장은 기다리지 않고 약속만 넘긴다. 조건 줄이 제품 조회보다 먼저 나가고,
   * 목록 자리만 도착을 기다린다. 받지 못해도 화면은 뜬다. 클라이언트가 다시 받는다.
   */
  const initialPagePromise = fetchProducts(filter)
    .then((response) => ({ key, response }))
    .catch(() => undefined);

  const [excludeCodes, initialPage] = await Promise.all([fetchExcludeCodes(), initialPagePromise]);

  return (
    <>
      <JsonLd
        data={
          initialPage
            ? collectionPageStructuredData({
                path: pagedCanonical(`/brands/${brand.id}`, filter.page),
                ...directoryPageContent("brand", brand.name, initialPage.response.items),
                products: initialPage.response.items,
                firstPosition: (filter.page - 1) * filter.size + 1,
              })
            : undefined
        }
      />
      <ProductList
        basePath={`/brands/${brand.id}`}
        surface="brand"
        fixedFilter={{ brandIds }}
        hiddenChips={["brand"]}
        stickyChips="brand"
        excludeCodes={excludeCodes.items}
        initialPage={initialPage}
        empty={<BrandProductsEmpty brandId={brand.id} />}
      />
    </>
  );
}

export default async function BrandDetailPage(props: PageProps<"/brands/[brandId]">) {
  const [{ brandId }, searchParams] = await Promise.all([props.params, props.searchParams]);

  /*
   * 브랜드 이름이 바의 제목이라 셸 전에 받는다. 상세 조회는 캐시되어 셸을 거의 늦추지 않고,
   * 없는 브랜드면 스트리밍 전이라 404 와 경로의 not-found.tsx 를 낼 수 있다.
   */
  const brand = await load(brandId);
  const params = toSearchParams(searchParams);
  await requireMyFilterSession(`/brands/${brandId}`, params);
  const filter = parseFilter(params);
  // 첫 장만 스트리밍한다. 뒤쪽 장은 목록까지 다 그린 뒤 보내므로 없는 장이면 404 를 낼 수 있다.
  const stream = filter.page === FIRST_PAGE;
  if (!stream) await requireProductPage({ ...filter, brandIds: [brand.id] });

  return (
    <BrandTitleScope>
      {/*
        이 화면의 대표 제목은 히어로의 브랜드명이다. 바의 제목은 p 로 내리고, 맨 위에서는 '브랜드관'이다가
        브랜드명이 바 아래로 가려지면 로고와 브랜드명으로 바뀐다(명세 S30-1).
      */}
      <DirectoryTopBar
        title={<BrandBarTitle name={brand.name} imageUrl={brand.imageUrl} />}
        align="center"
        titleAs="p"
        fallback={{ href: "/brands", label: "브랜드 전체" }}
      />
      <JsonLd
        data={breadcrumbList([
          { name: "브랜드", path: "/brands" },
          { name: brand.name, path: `/brands/${brand.id}` },
        ])}
      />

      {/* 브랜드 정보는 바 제목 때문에 이미 받아 두었으므로 기다리지 않고 바로 그린다. */}
      <BrandHero name={brand.name} englishName={brand.englishName} imageUrl={brand.imageUrl} />

      {/* 데이터 대기 중에는 목록 자리를 확보하고, 도착 후에는 카드별 스켈레톤으로 이어진다. */}
      <StreamBoundary stream={stream} fallback={<ProductListSkeleton hiddenChips={["brand"]} stickyChips="brand" />}>
        <BrandProducts params={props.params} searchParams={props.searchParams} />
      </StreamBoundary>
    </BrandTitleScope>
  );
}
