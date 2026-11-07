"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { CategoryTabs } from "./[categoryId]/category-tabs";

import { DirectoryTopBar } from "@/components/directory/DirectoryTopBar";

type Category = { readonly id: number; readonly name: string };

type CategoryFrameProps = {
  readonly categories: readonly (Category & { readonly children: readonly Category[] })[];
  /** 고른 카테고리의 제품 목록. 탭 패널로 감싼다. */
  readonly children: ReactNode;
};

/**
 * 대분류를 고르면 그 아래 소분류를 모두 탭으로 두고, 소분류를 고르면 형제들을 탭으로 보여 준다. 소분류를 보는 중에도 대분류
 * 전체로 돌아올 수 있도록 맨 앞에 `전체` 를 둔다. 지금 카테고리는 주소에서 읽는다. 없는 카테고리면 머리 없이 404 화면만 그린다.
 */
export function CategoryFrame({ categories, children }: CategoryFrameProps) {
  const id = Number(useParams<{ categoryId: string }>().categoryId);
  const parent = categories.find((category) => category.id === id);
  const owner = categories.find((category) => category.children.some((child) => child.id === id));
  const name = owner?.children.find((child) => child.id === id)?.name ?? parent?.name;
  const top = owner ?? parent;
  if (!name || !top) return children;

  return (
    <>
      <DirectoryTopBar title={name} align="start" fallback={{ href: "/categories", label: "카테고리 전체" }} />
      <CategoryTabs items={[{ id: top.id, name: "전체" }, ...top.children]} selectedId={id}>
        {children}
      </CategoryTabs>
    </>
  );
}
