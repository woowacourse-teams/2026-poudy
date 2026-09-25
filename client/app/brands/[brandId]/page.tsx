import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { BrandSummarySkeleton } from "@/components/directory/DetailHeadingSkeleton";
import { ProductList } from "@/components/product/ProductList";
import { ProductListSkeleton } from "@/components/product/ProductListSkeleton";
import { JsonLd } from "@/components/seo/JsonLd";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { StreamBoundary } from "@/components/ui/StreamBoundary";
import { SummaryEnd, SummaryHeader } from "@/components/ui/SummaryHeader";
import { ApiError } from "@/lib/api/client";
import { fetchBrand, fetchBrands, fetchExcludeCodes, fetchProducts } from "@/lib/api/products";
import { FIRST_PAGE, type Filter, parseFilter } from "@/lib/domain/filter";
import type { InitialPage } from "@/lib/hooks/useProductPages";
import { requireProductPage } from "@/lib/navigation/product-page-range";
import { type SearchParams, toSearchParams } from "@/lib/navigation/search-params";
import { OPEN_GRAPH_BASE, pagedCanonical } from "@/lib/seo/metadata";
import { breadcrumbList, itemList } from "@/lib/seo/structured-data";
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

/** 이 장에 담긴 제품을 구조화 데이터로 싣는다. 번호는 목록 전체에서의 자리로 센다. */
const pageItemList = (filter: Filter, initialPage: InitialPage | undefined) => {
  if (!initialPage) return undefined;
  return itemList(initialPage.response.items, (filter.page - 1) * filter.size + 1);
};

export async function generateMetadata(props: PageProps<"/brands/[brandId]">): Promise<Metadata> {
  const { brandId } = await props.params;
  const { page } = parseFilter(toSearchParams(await props.searchParams));
  // 조회에 실패해도 canonical 은 남긴다. 비워 두면 필터가 붙은 주소가 저마다 원본 행세를 한다.
  const canonical = pagedCanonical(`/brands/${brandId}`, page);

  try {
    const brand = await fetchBrand(Number(brandId));
    const title = `${brand.name} 제품`;
    const description = `${brand.name}의 제품을 성분으로 살펴봅니다.`;
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

/** 브랜드 소개는 제품 목록과 별개로 스트리밍한다. */
async function BrandSummary({ params }: { readonly params: PageProps<"/brands/[brandId]">["params"] }) {
  const { brandId } = await params;
  const [brand, brands] = await Promise.all([load(brandId), fetchBrands()]);

  // 상세 응답에는 제품 수가 없어 목록에서 찾는다.
  const productCount = brands.items.find((item) => item.id === brand.id)?.productCount;
  const brandDescription = [
    brand.englishName,
    productCount === undefined ? null : `제품 ${productCount.toLocaleString("ko-KR")}개`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section className="flex items-center gap-3 px-4">
        <JsonLd
          data={breadcrumbList([
            { name: "브랜드", path: "/brands" },
            { name: brand.name, path: `/brands/${brand.id}` },
          ])}
        />
        <BrandLogo name={brand.name} imageUrl={brand.imageUrl} loading="eager" size={40} />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[18px] font-bold text-text-primary">{brand.name}</h1>
          <span className="text-[11px] font-medium text-text-secondary">{brandDescription}</span>
        </div>
      </section>

      {/* 소개의 아래 끝. 여기가 머리 아래로 지나가면 축약형이 나타난다. */}
      <SummaryEnd />
    </>
  );
}

/**
 * 브랜드 소개가 머리 아래로 지나간 뒤 그 자리를 대신하는 축약형.
 * 바의 `브랜드관` 만 남으면 어느 브랜드의 목록을 보고 있는지 알 수 없다.
 *
 * 로고는 원래 배치와 같은 크기로 받는다. 줄여 받으면 같은 그림을 한 번 더 내려받는다.
 */
async function BrandCompact({ params }: { readonly params: PageProps<"/brands/[brandId]">["params"] }) {
  const { brandId } = await params;
  const brand = await load(brandId);

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <BrandLogo name={brand.name} imageUrl={brand.imageUrl} size={40} />
      <p className="truncate text-body font-bold text-text-primary">{brand.name}</p>
    </div>
  );
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
      <JsonLd data={pageItemList(filter, initialPage)} />
      <ProductList
        basePath={`/brands/${brand.id}`}
        surface="brand"
        fixedFilter={{ brandIds }}
        hiddenChips={["brand"]}
        stickyChips="brand"
        excludeCodes={excludeCodes.items}
        initialPage={initialPage}
      />
    </>
  );
}

export default async function BrandDetailPage(props: PageProps<"/brands/[brandId]">) {
  const [{ brandId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const id = Number(brandId);
  const filter = parseFilter(toSearchParams(searchParams));
  // 첫 장만 스트리밍한다. 뒤쪽 장은 목록까지 다 그린 뒤 보내므로 없는 장이면 404 를 낼 수 있다.
  const stream = filter.page === FIRST_PAGE;
  if (!stream && Number.isInteger(id)) await requireProductPage({ ...filter, brandIds: [id] });

  return (
    /* 이 화면의 대표 제목은 본문의 브랜드명이다. 바의 `브랜드관` 은 모양만 그대로 둔다. */
    <SummaryHeader
      title="브랜드관"
      summary={
        <StreamBoundary stream={stream} fallback={null}>
          <BrandCompact params={props.params} />
        </StreamBoundary>
      }
    >
      <StreamBoundary stream={stream} fallback={<BrandSummarySkeleton />}>
        <BrandSummary params={props.params} />
      </StreamBoundary>

      {/* 데이터 대기 중에는 목록 자리를 확보하고, 도착 후에는 카드별 스켈레톤으로 이어진다. */}
      <StreamBoundary stream={stream} fallback={<ProductListSkeleton hiddenChips={["brand"]} stickyChips="brand" />}>
        <BrandProducts params={props.params} searchParams={props.searchParams} />
      </StreamBoundary>
    </SummaryHeader>
  );
}
