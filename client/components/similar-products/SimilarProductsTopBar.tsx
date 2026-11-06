"use client";

import { TopBar } from "@poudy/design-system/top-bar";
import { usePathname } from "next/navigation";

import { useSubScreenBack } from "@/components/navigation/useSubScreenBack";
import { SIMILAR_PRODUCTS_PATH } from "@/lib/domain/similar-products";

export function SimilarProductsTopBar() {
  const pathname = usePathname();
  const back = useSubScreenBack(
    pathname === SIMILAR_PRODUCTS_PATH
      ? { href: "/", label: "홈으로" }
      : { href: SIMILAR_PRODUCTS_PATH, label: "제품 선택으로" },
  );
  return <TopBar variant="sub" title="유사템 찾기" back={back} />;
}
