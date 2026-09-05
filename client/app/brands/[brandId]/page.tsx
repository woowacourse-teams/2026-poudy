import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";

import { BrandSummarySkeleton } from "@/components/directory/DetailHeadingSkeleton";
import { ProductList } from "@/components/product/ProductList";
import { ProductListSkeleton } from "@/components/product/ProductListSkeleton";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { TopBar } from "@/components/ui/TopBar";
import { ApiError } from "@/lib/api/client";
import { fetchBrand, fetchBrands, fetchExcludeCodes, fetchProducts } from "@/lib/api/products";
import { parseFilter } from "@/lib/domain/filter";
import { type SearchParams, toSearchParams } from "@/lib/navigation/search-params";

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

  try {
    const brand = await fetchBrand(Number(brandId));
    const title = `${brand.name} 제품`;
    const description = `${brand.name}의 제품을 성분으로 살펴봅니다.`;
    const image = `/brands/${brandId}/opengraph-image`;
    return {
      title,
      description,
      alternates: { canonical: `/brands/${brandId}` },
      openGraph: { title, description, type: "website", images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  } catch {
    return {};
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
    <section className="flex items-center gap-3 px-4">
      <BrandLogo name={brand.name} imageUrl={brand.imageUrl} loading="eager" size={40} />
      <span className="flex flex-col gap-0.5">
        <span className="text-[18px] font-bold text-text-primary">{brand.name}</span>
        <span className="text-[11px] font-medium text-text-secondary">{brandDescription}</span>
      </span>
    </section>
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
  const key = JSON.stringify({ ...filter, page: 0 });

  /*
   * 첫 장은 기다리지 않고 약속만 넘긴다. 조건 줄이 제품 조회보다 먼저 나가고,
   * 목록 자리만 도착을 기다린다. 받지 못해도 화면은 뜬다. 클라이언트가 다시 받는다.
   */
  const initialPagePromise = fetchProducts({ ...filter, page: 0 })
    .then((response) => ({ key, response }))
    .catch(() => undefined);

  const [excludeCodes, initialPage] = await Promise.all([fetchExcludeCodes(), initialPagePromise]);

  return (
    <ProductList
      basePath={`/brands/${brand.id}`}
      surface="brand"
      fixedFilter={{ brandIds }}
      hiddenChips={["brand"]}
      excludeCodes={excludeCodes.items}
      initialPage={initialPage}
    />
  );
}

export default function BrandDetailPage(props: PageProps<"/brands/[brandId]">) {
  return (
    <>
      <TopBar title="브랜드관" variant="sub" />

      <Suspense fallback={<BrandSummarySkeleton />}>
        <BrandSummary params={props.params} />
      </Suspense>

      {/* 데이터 대기 중에는 목록 자리를 확보하고, 도착 후에는 카드별 스켈레톤으로 이어진다. */}
      <Suspense fallback={<ProductListSkeleton hiddenChips={["brand"]} />}>
        <BrandProducts params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
