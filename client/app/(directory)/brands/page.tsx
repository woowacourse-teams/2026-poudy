import type { Metadata } from "next";

import { BrandDirectory } from "@/components/directory/BrandDirectory";
import { fetchBrands } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "브랜드",
  description: "브랜드별 화장품과 전성분 정보를 확인해 보세요.",
  alternates: { canonical: "/brands" },
};

// 브랜드가 늘면 값이 바뀌므로 하루에 한 번 다시 만든다.
export const revalidate = 86400;

export default async function BrandsPage() {
  const brands = await fetchBrands();

  // 머리와 탭은 (directory) 레이아웃이 그린다.
  return <BrandDirectory brands={brands.items} />;
}
