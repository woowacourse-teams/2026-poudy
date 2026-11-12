import type { Metadata } from "next";
import { Suspense } from "react";

import Loading from "./loading";

import { SimilarProductsStart } from "@/components/similar-products/SimilarProductsStart";
import { MOCK_POPULAR_DUPES } from "@/mocks/popular-dupes";
import { STAGING_POPULAR_DUPES } from "@/mocks/popular-dupes.staging";

export const metadata: Metadata = {
  title: "유사템 찾기",
  description: "제품명이나 브랜드를 검색하거나 내 파우치에서 제품을 골라 성분이 비슷한 대체품을 찾아보세요.",
  alternates: { canonical: "/similar-products" },
  robots: { index: false, follow: true },
};

export default function Page() {
  const popularDupes = process.env.NEXT_PUBLIC_ENVIRONMENT === "staging" ? STAGING_POPULAR_DUPES : MOCK_POPULAR_DUPES;
  return (
    <Suspense fallback={<Loading />}>
      {/* #1037: 조회수 기준 API가 준비되면 페이지에서 받은 응답을 같은 표시 모델로 넘긴다. */}
      <SimilarProductsStart popularDupes={popularDupes} />
    </Suspense>
  );
}
