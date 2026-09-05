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
      <TopBar title="카테고리" variant="root" />
      {/* 디자인의 본문 여백. 탭과 디렉터리를 함께 감싼다. */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-4">
        <DirectoryTabs current="category" />
        <CategoryDirectory categories={categories.items} />
      </div>
    </>
  );
}
