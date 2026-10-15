import type { Metadata } from "next";

import { ShelfGuide } from "@/components/shelf/ShelfGuide";

export const metadata: Metadata = {
  title: "내 선반 소개",
  description: "안 맞았던 제품만 알려 주면 함께 든 성분을 찾아 주는 내 선반을 소개해요.",
  alternates: { canonical: "/shelf/guide" },
};

export default function ShelfGuidePage() {
  return <ShelfGuide />;
}
