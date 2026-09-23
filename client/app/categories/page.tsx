import type { Metadata } from "next";

import { CategoryDirectory } from "@/components/directory/CategoryDirectory";
import { DirectoryTabs } from "@/components/directory/DirectoryTabs";
import { TopBar } from "@/components/ui/TopBar";
import { fetchCategories } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "카테고리",
  description: "카테고리별 화장품과 전성분 정보를 확인해 보세요.",
  alternates: { canonical: "/categories" },
};

// 제품 수가 늘면 값이 바뀌므로 하루에 한 번 다시 만든다.
export const revalidate = 86400;

export default async function CategoriesPage() {
  const categories = await fetchCategories();

  return (
    <>
      <TopBar title="카테고리" variant="root" edge={false} />
      {/* 탭은 상단바와 함께 붙도록 본문 묶음 밖에 두고, 본문 윗여백과 사이 간격은 탭 줄이 들고 있다. */}
      <DirectoryTabs current="category" />
      <div className="flex flex-1 flex-col px-4 pb-4">
        <CategoryDirectory categories={categories.items} />
      </div>
    </>
  );
}
