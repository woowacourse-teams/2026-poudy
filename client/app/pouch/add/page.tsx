import type { Metadata } from "next";

import { ShelfAddScreen } from "@/components/shelf/ShelfAddScreen";

export const metadata: Metadata = {
  title: "파우치에 제품 추가",
  description: "제품명이나 브랜드로 찾아 파우치에 저장해 보세요.",
  alternates: { canonical: "/pouch/add" },
  robots: { index: false },
  openGraph: null,
  twitter: null,
};

export default function ShelfAddPage() {
  return <ShelfAddScreen />;
}
