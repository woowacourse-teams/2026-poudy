import type { Metadata } from "next";

import { BrandDirectory } from "@/components/directory/BrandDirectory";
import { DirectoryTabs } from "@/components/directory/DirectoryTabs";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { fetchBrands } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "브랜드",
};

// 고정 URL 이라 원래는 ISR 대상이다. 다만 목 서버는 빌드 시점에 뜨지 않아
// 미리 만들 수 없다. 실제 API 에 붙일 때 revalidate 로 바꾼다.
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await fetchBrands();

  return (
    <>
      <TopBar title="브랜드" variant="root" />
      <DirectoryTabs current="brand" />
      <BrandDirectory brands={brands.items} />
      <BottomNavigation />
    </>
  );
}
