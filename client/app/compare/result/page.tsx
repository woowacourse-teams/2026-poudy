import type { Metadata } from "next";

import { ProductComparisonScreen } from "@/components/comparison/ProductComparisonScreen";

/* 비교함은 기기마다 달라 검색 결과에 낼 내용이 없다. */
export const metadata: Metadata = {
  title: "제품 비교",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function ComparisonResultPage() {
  return <ProductComparisonScreen />;
}
