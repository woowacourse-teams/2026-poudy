import type { Metadata } from "next";
import { Suspense } from "react";

import Loading from "./loading";

import { SimilarProductsStart } from "@/components/similar-products/SimilarProductsStart";

export const metadata: Metadata = {
  title: "유사템 찾기",
  description: "제품명이나 브랜드를 검색하거나 내 선반에서 제품을 골라 성분이 비슷한 대체품을 찾아보세요.",
  alternates: { canonical: "/similar-products" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SimilarProductsStart />
    </Suspense>
  );
}
