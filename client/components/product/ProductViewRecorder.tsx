"use client";

import { useEffect, useRef } from "react";

import { recordProductView } from "@/lib/api/products";

/** 브라우저에서 실제 상세 화면이 표시된 제품만 방문으로 기록한다. */
export function ProductViewRecorder({ productId }: { readonly productId: number }) {
  const recordedProductId = useRef<number | null>(null);

  useEffect(() => {
    if (recordedProductId.current === productId) return;
    recordedProductId.current = productId;

    // 기록 실패는 화면 이용을 막지 않으며, 중복 집계를 피하려고 자동 재시도하지 않는다.
    void recordProductView(productId).catch(() => undefined);
  }, [productId]);

  return null;
}
