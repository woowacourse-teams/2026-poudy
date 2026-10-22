import type { Metadata } from "next";

import { ShelfGuide } from "@/components/shelf/ShelfGuide";

export const metadata: Metadata = {
  title: "선반 소개",
  description: "써 본 화장품이 쌓일수록 나에게 맞는 화장품이 보이는 내 선반을 소개해요.",
  alternates: { canonical: "/shelf/guide" },
};

export default function ShelfGuidePage() {
  return <ShelfGuide />;
}
