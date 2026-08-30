import type { Metadata } from "next";

import { BrandDirectory } from "@/components/directory/BrandDirectory";
import { DirectoryTabs } from "@/components/directory/DirectoryTabs";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { fetchBrands } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "브랜드",
  description: "브랜드별 화장품과 전성분 정보를 확인해 보세요.",
  alternates: { canonical: "/brands" },
};

// 고정 URL 이라 원래는 ISR 대상이다. 다만 목 서버는 빌드 시점에 뜨지 않아
// 미리 만들 수 없다. 실제 API 에 붙일 때 revalidate 로 바꾼다.
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await fetchBrands();

  return (
    <>
      <TopBar title="브랜드" variant="root" />
      {/* 디자인의 본문 여백. 탭과 디렉터리를 함께 감싼다. */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-4">
        <DirectoryTabs current="brand" />
        <BrandDirectory brands={brands.items} />
      </div>
      <BottomNavigation />
    </>
  );
}
