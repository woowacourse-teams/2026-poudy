"use client";

import { useEffect } from "react";

import { reloadSavedProducts } from "@/lib/storage/saved-products";

/*
 * 뒤로 가기로 돌아온 페이지를 브라우저가 bfcache 에서 되살리면 JS 상태도 떠날 때 그대로다.
 * 다른 문서에서 로그아웃하거나 로그인했어도 이 페이지는 모르므로, 되살아날 때 회원 상태를 다시 묻는다.
 */
export function BackForwardCacheSync() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      void reloadSavedProducts();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
