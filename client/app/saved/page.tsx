import type { Metadata } from "next";

import { SavedScreen } from "@/components/saved/SavedScreen";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "저장함",
  alternates: { canonical: "/saved" },
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function SavedPage() {
  return (
    <>
      <TopBar title="저장함" variant="root" />
      <SavedScreen />
      <BottomNavigation />
    </>
  );
}
