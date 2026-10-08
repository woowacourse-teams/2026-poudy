"use client";

import { useRef } from "react";

import type { IngredientSheetTarget, SheetCloseMethod } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/**
 * 제품 상세의 성분·성분군·주의 성분 시트를 열고 닫은 것을 남긴다.
 *
 * 닫을 때 열려 있던 시간을 함께 보내려고 연 대상과 시각을 붙들어 둔다. 렌더링과 상관없는 값이라 상태가 아니라 ref 에 둔다.
 * 이미 닫힌 뒤에 들어온 닫기(닫히는 전환 중 바깥을 한 번 더 누른 경우 등)는 한 번만 센다.
 */
export const useIngredientSheetTracking = () => {
  const openedRef = useRef<{ readonly target: IngredientSheetTarget; readonly at: number }>(undefined);

  const opened = (target: IngredientSheetTarget) => {
    openedRef.current = { target, at: performance.now() };
    track("ingredient_sheet_opened", target);
  };

  const closed = (method: SheetCloseMethod) => {
    const current = openedRef.current;
    if (!current) return;
    openedRef.current = undefined;
    const openSeconds = Math.round((performance.now() - current.at) / 100) / 10;
    track("ingredient_sheet_closed", { ...current.target, close_method: method, open_seconds: openSeconds });
  };

  return { opened, closed };
};
