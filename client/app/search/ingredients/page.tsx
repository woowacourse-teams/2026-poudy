import type { Metadata } from "next";
import { Suspense } from "react";

import { IngredientSearchScreen } from "@/components/search/IngredientSearchScreen";
import { fetchExcludeCodes } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "성분 필터링",
};

// 입력이 중심이라 미리 만들지 않는다.
export const dynamic = "force-dynamic";

/** S03 성분 필터링 탭. */
export default async function IngredientSearchPage() {
  const excludeCodes = await fetchExcludeCodes();

  // 기다리는 동안에도 자리를 채워 둔다. 비워 두면 하단 바가 본문 아래로 올라왔다 내려간다.
  return (
    <Suspense fallback={<main className="flex-1 p-4 text-[13px] text-text-secondary">불러오는 중…</main>}>
      <IngredientSearchScreen excludeCodes={excludeCodes.items} />
    </Suspense>
  );
}
