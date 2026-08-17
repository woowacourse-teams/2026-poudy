import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductList } from "@/components/product/ProductList";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { fetchBrands, fetchCategories, fetchExcludeCodes } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "카테고리 제품",
};

// 조건 조합이 붙는 목록이라 미리 만들지 않는다.
export const dynamic = "force-dynamic";

export default async function CategoryProductsPage(props: PageProps<"/categories/[categoryId]">) {
  const { categoryId } = await props.params;
  const id = Number(categoryId);
  if (!Number.isInteger(id)) notFound();

  const [categories, brands, excludeCodes] = await Promise.all([fetchCategories(), fetchBrands(), fetchExcludeCodes()]);

  const child = categories.items.flatMap((category) => category.children).find((candidate) => candidate.id === id);
  const parent = categories.items.find((category) => category.id === id);
  const name = child?.name ?? parent?.name;

  if (!name) notFound();

  return (
    <>
      <TopBar title={name} variant="sub" />

      <Suspense fallback={<p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>}>
        <ProductList
          basePath={`/categories/${id}`}
          fixedFilter={{ categoryIds: [id] }}
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
