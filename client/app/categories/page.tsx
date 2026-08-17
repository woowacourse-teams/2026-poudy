import type { Metadata } from "next";

import { CategoryDirectory } from "@/components/directory/CategoryDirectory";
import { DirectoryTabs } from "@/components/directory/DirectoryTabs";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { fetchCategories } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "카테고리",
};

// 제품 수가 늘면 값이 바뀌므로 원래는 ISR 대상이다. 다만 목 서버는 빌드 시점에
// 뜨지 않아 미리 만들 수 없다. 실제 API 에 붙일 때 revalidate 로 바꾼다.
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await fetchCategories();

  return (
    <>
      <TopBar title="카테고리" variant="root" />
      <DirectoryTabs current="category" />
      <CategoryDirectory categories={categories.items} />
      <BottomNavigation />
    </>
  );
}
