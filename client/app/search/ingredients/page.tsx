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

  return (
    <Suspense fallback={<p className="p-4 text-[13px] text-text-secondary">불러오는 중…</p>}>
      <IngredientSearchScreen excludeCodes={excludeCodes.items} />
    </Suspense>
  );
}
