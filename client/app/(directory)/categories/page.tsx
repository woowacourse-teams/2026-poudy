import type { Metadata } from "next";

import { CategoryDirectory } from "@/components/directory/CategoryDirectory";
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

  // 머리와 탭은 (directory) 레이아웃이 그린다.
  return <CategoryDirectory categories={categories.items} />;
}
