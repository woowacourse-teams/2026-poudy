"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type { IngredientGroupEntryPoint } from "@/lib/analytics/events";
import { readPageEntry } from "@/lib/analytics/page-entry";
import { track } from "@/lib/analytics/track";

const ENTRY_POINTS: readonly IngredientGroupEntryPoint[] = [
  "product_detail",
  "ingredient_group_sheet",
  "caution_sheet",
];

/** from 이 없으면 검색 결과나 공유 링크처럼 바로 들어온 것으로 본다. */
const entryPointOf = (raw: string | null): IngredientGroupEntryPoint =>
  ENTRY_POINTS.find((entry) => entry === raw) ?? "direct";

/**
 * 성분군 설명 조회. 성분 설명과 같이 ISR 로 캐시하므로 유입 경로는 브라우저에서 읽는다.
 * 유입 경로는 세션에서 읽으며 기존 from 링크도 호환한다.
 */
export function TrackIngredientGroupView({ groupCode }: { readonly groupCode: string }) {
  const from = useSearchParams().get("from");

  useEffect(() => {
    track("ingredient_group_viewed", {
      group_code: groupCode,
      entry_point: entryPointOf(from ?? readPageEntry() ?? null),
    });
  }, [groupCode, from]);

  return null;
}
