import { CategoryFrame } from "./category-frame";

import { fetchCategories } from "@/lib/api/products";

/**
 * S28 카테고리 상품의 머리(상단 내비 · 카테고리 가로 트랙). 탭을 [categoryId] 위에 두어, 탭을 옮겨도 머리가 다시 그려지지
 * 않게 한다. 그래서 밑줄 하나가 이전 탭에서 새 탭으로 미끄러진다. 카테고리 목록은 오래 캐시되어 셸을 거의 늦추지 않는다.
 */
export default async function CategoriesLayout({ children }: { readonly children: React.ReactNode }) {
  const categories = await fetchCategories();
  return <CategoryFrame categories={categories.items}>{children}</CategoryFrame>;
}
