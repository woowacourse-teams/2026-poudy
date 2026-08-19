"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type { IngredientEntryPoint } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

const ENTRY_POINTS: readonly IngredientEntryPoint[] = ["product_detail", "search", "ingredient_filter"];

const entryPointOf = (raw: string | null): IngredientEntryPoint =>
  ENTRY_POINTS.find((entry) => entry === raw) ?? "product_detail";

/**
 * 성분 설명은 ISR 로 캐시한다. 서버에서 searchParams 를 읽으면 요청마다 렌더링하게 되므로
 * 유입 경로는 브라우저에서 읽는다. 링크가 붙인 from 쿼리를 그대로 쓴다.
 */
export function TrackIngredientView({ ingredientId }: { readonly ingredientId: number }) {
  const from = useSearchParams().get("from");

  useEffect(() => {
    track("ingredient_viewed", { ingredient_id: ingredientId, entry_point: entryPointOf(from) });
  }, [ingredientId, from]);

  return null;
}
