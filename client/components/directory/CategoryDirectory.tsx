"use client";

import type { CategoryResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { DirectoryList } from "@/components/ui/DirectoryList";

/** S08 카테고리. 대분류를 고르면 오른쪽에 소분류가 나온다. */
export function CategoryDirectory({ categories }: { readonly categories: readonly CategoryResponse[] }) {
  const [selectedId, setSelectedId] = useState(String(categories[0]?.id ?? ""));
  const selected = categories.find((category) => String(category.id) === selectedId);

  return (
    <DirectoryList
      railLabel="대분류"
      rail={categories.map((category) => ({ id: String(category.id), label: category.name }))}
      selectedRailId={selectedId}
      onSelectRail={setSelectedId}
      title={selected?.name ?? ""}
      description="원하는 제품 유형을 선택하세요"
      rows={[
        ...(selected
          ? [
              {
                id: "all",
                label: "전체",
                count: selected.productCount,
                href: `/products?categoryIds=${selected.children.map((child) => child.id).join(",")}`,
              },
            ]
          : []),
        ...(selected?.children ?? []).map((child) => ({
          id: String(child.id),
          label: child.name,
          count: child.productCount,
          href: `/products?categoryIds=${child.id}`,
        })),
      ]}
    />
  );
}
