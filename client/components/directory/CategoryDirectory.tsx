"use client";

import type { CategoryResponse } from "@poudy/api/api.zod";
import { useState } from "react";

import { DirectoryList } from "@/components/ui/DirectoryList";
import { track } from "@/lib/analytics/track";

/** S08 카테고리. 대분류를 고르면 오른쪽에 소분류가 나온다. */
export function CategoryDirectory({ categories }: { readonly categories: readonly CategoryResponse[] }) {
  const [selectedId, setSelectedId] = useState(String(categories[0]?.id ?? ""));

  return (
    <DirectoryList
      railLabel="대분류"
      rail={categories.map((category) => ({ id: String(category.id), label: category.name }))}
      selectedRailId={selectedId}
      onSelectRail={setSelectedId}
      onSelectRow={(row) =>
        track("category_selected", {
          category_id: Number(row.id === "all" ? selectedId : row.id),
          category_name:
            row.id === "all" ? categories.find((category) => String(category.id) === selectedId)?.name : row.label,
          origin_surface: "category",
        })
      }
      panels={categories.map((category) => ({
        railId: String(category.id),
        title: category.name,
        description: "원하는 제품 유형을 선택하세요",
        rows: [
          // 전체는 대분류 자신의 화면으로, 소분류는 각자의 화면으로 보낸다.
          { id: "all", label: "전체", count: category.productCount, href: `/categories/${category.id}` },
          ...category.children.map((child) => ({
            id: String(child.id),
            label: child.name,
            count: child.productCount,
            href: `/categories/${child.id}`,
          })),
        ],
      }))}
    />
  );
}
