import type { Metadata } from "next";

import { ShelfScreen } from "@/components/shelf/ShelfScreen";

export const metadata: Metadata = {
  title: "선반",
  description: "쓰는 화장품과 써 본 화장품을 올리고, 안 맞았던 제품에 함께 든 성분을 찾아보세요.",
  alternates: { canonical: "/shelf" },
  openGraph: null,
  twitter: null,
};

export default function ShelfPage() {
  return <ShelfScreen />;
}
