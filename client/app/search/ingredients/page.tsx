import type { Metadata } from "next";
import { Suspense } from "react";

import { IngredientSearchScreen } from "@/components/search/IngredientSearchScreen";
import { fetchExcludeCodes } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "성분 검색",
  description: "포함하거나 제외할 성분을 골라 조건에 맞는 화장품을 찾아보세요.",
  alternates: { canonical: "/search/ingredients" },
};

// 조건은 클라이언트가 읽으므로 서버가 그리는 껍데기는 하나뿐이다.
// 제외 성분군만 하루에 한 번 다시 받는다.
export const revalidate = 86400;

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
