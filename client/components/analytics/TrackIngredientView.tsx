"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type { IngredientEntryPoint } from "@/lib/analytics/events";
import { readPageEntry } from "@/lib/analytics/page-entry";
import { track } from "@/lib/analytics/track";

const ENTRY_POINTS: readonly IngredientEntryPoint[] = [
  "product_detail",
  "search",
  "ingredient_filter",
  "ingredient_sheet",
  "ingredient_group_sheet",
  "ingredient_group_detail",
  "shelf",
];

const entryPointOf = (raw: string | null): IngredientEntryPoint =>
  ENTRY_POINTS.find((entry) => entry === raw) ?? "product_detail";

/**
 * 성분 설명은 ISR 로 캐시한다. 서버에서 searchParams 를 읽으면 요청마다 렌더링하게 되므로
 * 유입 경로는 브라우저에서 읽는다. 유입 경로는 세션에서 읽으며 기존 from 링크도 호환한다.
 */
export function TrackIngredientView({ ingredientId }: { readonly ingredientId: number }) {
  const from = useSearchParams().get("from");

  useEffect(() => {
    track("ingredient_viewed", {
      ingredient_id: ingredientId,
      entry_point: entryPointOf(from ?? readPageEntry() ?? null),
    });
  }, [ingredientId, from]);

  return null;
}
