"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getSavedProductsServerSnapshot,
  getSavedProductsSnapshot,
  subscribeSavedProducts,
  toggleSaved,
} from "@/lib/storage/saved-products";

/**
 * 저장함은 localStorage 에 있어 서버가 알 수 없다.
 * 서버 스냅샷을 빈 목록으로 두어 첫 HTML 이 어긋나지 않게 한다.
 */
export const useSavedProducts = () => {
  const savedIds = useSyncExternalStore(
    subscribeSavedProducts,
    getSavedProductsSnapshot,
    getSavedProductsServerSnapshot,
  );

  const isSaved = useCallback((productId: number) => savedIds.includes(productId), [savedIds]);

  return { savedIds, toggle: toggleSaved, isSaved };
};
