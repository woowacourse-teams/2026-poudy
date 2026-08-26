import type { Metadata } from "next";

import { CategoryDirectory } from "@/components/directory/CategoryDirectory";
import { DirectoryTabs } from "@/components/directory/DirectoryTabs";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { fetchCategories } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "카테고리",
  alternates: { canonical: "/categories" },
};

// 제품 수가 늘면 값이 바뀌므로 원래는 ISR 대상이다. 다만 목 서버는 빌드 시점에
// 뜨지 않아 미리 만들 수 없다. 실제 API 에 붙일 때 revalidate 로 바꾼다.
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await fetchCategories();

  return (
    <>
      <TopBar title="카테고리" variant="root" />
      {/* 디자인의 본문 여백. 탭과 디렉터리를 함께 감싼다. */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-4">
        <DirectoryTabs current="category" />
        <CategoryDirectory categories={categories.items} />
      </div>
      <BottomNavigation />
    </>
  );
}
