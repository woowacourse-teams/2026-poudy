import type { Metadata } from "next";

import { SavedScreen } from "@/components/saved/SavedScreen";
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "보관함",
  description: "Poudy에서 저장한 화장품을 한곳에서 확인해 보세요.",
  alternates: { canonical: "/saved" },
  openGraph: null,
  twitter: null,
};

export default function SavedPage() {
  return (
    <>
      <TopBar title="저장함" variant="root" />
      <SavedScreen />
    </>
  );
}
