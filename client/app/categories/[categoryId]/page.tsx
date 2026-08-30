import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryTrack } from "@/components/directory/CategoryTrack";
import { ProductList } from "@/components/product/ProductList";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { fetchBrands, fetchCategories, fetchExcludeCodes } from "@/lib/api/products";

export async function generateMetadata(props: PageProps<"/categories/[categoryId]">): Promise<Metadata> {
  const { categoryId } = await props.params;
  const canonical = `/categories/${categoryId}`;
  const id = Number(categoryId);

  if (!Number.isInteger(id)) return { alternates: { canonical } };

  try {
    const categories = await fetchCategories();
    const parent = categories.items.find((category) => category.id === id);
    const child = categories.items.flatMap((category) => category.children).find((category) => category.id === id);
    const name = child?.name ?? parent?.name;

    if (!name) return { alternates: { canonical } };

    return {
      title: `${name} 화장품`,
      description: `${name} 카테고리의 화장품과 전성분 정보를 확인해 보세요.`,
      alternates: { canonical },
    };
  } catch {
    return { alternates: { canonical } };
  }
}

// 조건 조합이 붙는 목록이라 미리 만들지 않는다.
export const dynamic = "force-dynamic";

export default async function CategoryProductsPage(props: PageProps<"/categories/[categoryId]">) {
  const { categoryId } = await props.params;
  const id = Number(categoryId);
  if (!Number.isInteger(id)) notFound();

  const [categories, brands, excludeCodes] = await Promise.all([fetchCategories(), fetchBrands(), fetchExcludeCodes()]);

  // 대분류를 고르면 그 아래 소분류를 모두 담고, 소분류를 고르면 형제들을 가로로 보여 준다.
  const parent = categories.items.find((category) => category.id === id);
  const owner = categories.items.find((category) => category.children.some((child) => child.id === id));
  const child = owner?.children.find((candidate) => candidate.id === id);

  const name = child?.name ?? parent?.name;
  if (!name) notFound();

  // 소분류를 보는 중에도 대분류 전체로 돌아올 수 있도록 맨 앞에 `전체` 를 둔다.
  const top = owner ?? parent;
  const trackItems = top ? [{ id: top.id, name: "전체" }, ...top.children] : [];
  const categoryIds = child ? [child.id] : (parent?.children ?? []).map((item) => item.id);

  return (
    <>
      {/* 소분류 이름은 바로 아래 줄이 이미 밝히므로, 제목에는 대분류를 둔다. */}
      <TopBar title={top?.name ?? name} variant="root" showBack />

      <div className="px-4">
        <CategoryTrack items={trackItems} selectedId={id} />
      </div>

      <Suspense fallback={<p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>}>
        <ProductList
          basePath={`/categories/${id}`}
          surface="category"
          fixedFilter={{ categoryIds }}
          hiddenChips={["category"]}
          categories={categories.items}
          brands={brands.items}
          excludeCodes={excludeCodes.items}
        />
      </Suspense>

      <BottomNavigation />
    </>
  );
}
