import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductList } from "@/components/product/ProductList";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { TopBar } from "@/components/ui/TopBar";
import { ApiError } from "@/lib/api/client";
import { fetchBrand, fetchBrands, fetchExcludeCodes } from "@/lib/api/products";

export const revalidate = 86400;

const load = async (raw: string) => {
  const brandId = Number(raw);
  if (!Number.isInteger(brandId)) notFound();

  try {
    return await fetchBrand(brandId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
};

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

export default async function BrandDetailPage(props: PageProps<"/brands/[brandId]">) {
  const { brandId } = await props.params;
  const [brand, brands, excludeCodes] = await Promise.all([load(brandId), fetchBrands(), fetchExcludeCodes()]);

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
      {/* 이름만 두면 바로 아래 큰 이름과 겹쳐 읽힌다. 어떤 화면인지 함께 밝힌다. */}
      <TopBar title={`${brand.name} 브랜드관`} variant="sub" />

      <section className="flex items-center gap-3 px-4">
        <BrandLogo name={brand.name} imageUrl={brand.imageUrl} size={40} />
        <span className="flex flex-col gap-0.5">
          <span className="text-[18px] font-bold text-text-primary">{brand.name}</span>
          <span className="text-[11px] font-medium text-text-secondary">{brandDescription}</span>
        </span>
      </section>

      {/* 브랜드 제품은 목록 화면과 같은 규칙으로 보여 준다. */}
      <Suspense fallback={<p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>}>
        <ProductList
          basePath={`/brands/${brand.id}`}
          surface="brand"
          fixedFilter={{ brandIds: [brand.id] }}
          hiddenChips={["brand"]}
          excludeCodes={excludeCodes.items}
        />
      </Suspense>
    </>
  );
}
