import type { Metadata } from "next";

import { ShelfFilterScreen } from "@/components/shelf/ShelfFilterScreen";

export const metadata: Metadata = {
  title: "검색에서 제외",
  description: "안 맞을 수 있는 성분 중 검색할 때 뺄 성분을 골라 주세요.",
  alternates: { canonical: "/shelf/filter" },
  robots: { index: false },
  openGraph: null,
  twitter: null,
};

export default function ShelfFilterPage() {
  return <ShelfFilterScreen />;
}
