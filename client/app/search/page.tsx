import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchScreen } from "@/components/search/SearchScreen";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";
import { fetchExcludeCodes } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "탐색 조건 설정",
};

// 입력이 중심이라 미리 만들지 않는다.
export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const excludeCodes = await fetchExcludeCodes();

  return (
    <>
      <TopBar title="탐색 조건 설정" variant="sub" />

      <Suspense fallback={<p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>}>
        <SearchScreen excludeCodes={excludeCodes.items} />
      </Suspense>

      <BottomNavigation />
    </>
  );
}
