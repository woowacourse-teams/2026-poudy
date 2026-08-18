import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductList } from "@/components/product/ProductList";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
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
    return { title: `${brand.name} 제품`, description: `${brand.name}의 제품을 성분으로 살펴봅니다.` };
  } catch {
    return {};
  }
}

export default async function BrandDetailPage(props: PageProps<"/brands/[brandId]">) {
  const { brandId } = await props.params;
  const [brand, brands, excludeCodes] = await Promise.all([load(brandId), fetchBrands(), fetchExcludeCodes()]);

  return (
    <>
      <TopBar title={brand.name} variant="sub" />

      <section className="flex items-center gap-3 px-4 py-4">
        <span className="size-14 shrink-0 rounded-full bg-surface" />
        <span className="flex flex-col">
          <span className="text-[16px] font-bold text-text-primary">{brand.name}</span>
          <span className="text-[12px] text-text-secondary">{brand.englishName}</span>
        </span>
      </section>

      {/* 브랜드 제품은 목록 화면과 같은 규칙으로 보여 준다. */}
      <Suspense fallback={<p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>}>
        <ProductList
          basePath={`/brands/${brand.id}`}
          fixedFilter={{ brandIds: [brand.id] }}
          hiddenChips={["brand"]}
          categories={brand.categories}
          brands={brands.items}
          excludeCodes={excludeCodes.items}
        />
      </Suspense>

      <BottomNavigation />
    </>
  );
}
