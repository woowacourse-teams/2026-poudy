"use client";

import { usePathname } from "next/navigation";

import { ComparisonTrayFloat, ComparisonTrayReserve } from "./ComparisonTrayBar";

import { isProductListPath } from "@/components/ui/bottom-navigation-path";

/**
 * 제품 목록의 비교함 띠. 담은 제품이 있으면 둘러보는 동안 계속 보이도록 하단 내비 바로 위에 띄운다.
 * 목록 화면은 저마다 구조가 달라, 문의 버튼처럼 레이아웃에서 경로로 정한다.
 */
export function ComparisonTrayListSlot() {
  const pathname = usePathname();

  if (!isProductListPath(pathname)) return null;

  return (
    <>
      <ComparisonTrayReserve />
      <ComparisonTrayFloat atScreenEnd={false} className="bottom-(--bottom-navigation-height)" />
    </>
  );
}
