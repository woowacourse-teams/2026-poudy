import type { Metadata } from "next";

import { SavedScreen } from "@/components/saved/SavedScreen";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "저장함",
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
