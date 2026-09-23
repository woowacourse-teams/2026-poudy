import type { Metadata } from "next";
import { Suspense } from "react";

import { IngredientSearchScreen, IngredientSearchScreenFallback } from "@/components/search/IngredientSearchScreen";
import { fetchExcludeCodes } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "성분 검색",
  description: "포함하거나 제외할 성분을 골라 조건에 맞는 화장품을 찾아보세요.",
  alternates: { canonical: "/search/ingredients" },
};

// 조건은 클라이언트가 읽으므로 서버가 그리는 것은 조건 없는 모양 하나뿐이다.
// 제외 성분군만 하루에 한 번 다시 받는다.
export const revalidate = 86400;

/** S03 성분 필터링 탭. */
export default async function IngredientSearchPage() {
  const excludeCodes = await fetchExcludeCodes();

  /*
   * 조건을 읽기 전에는 조건 없는 화면을 그대로 그린다. 조건 없이 들어온 사람은 스크립트가
   * 붙어도 화면이 바뀌지 않는다.
   */
  return (
    <Suspense fallback={<IngredientSearchScreenFallback excludeCodes={excludeCodes.items} />}>
      <IngredientSearchScreen excludeCodes={excludeCodes.items} />
    </Suspense>
  );
}
