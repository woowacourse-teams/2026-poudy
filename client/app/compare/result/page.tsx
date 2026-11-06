import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductComparisonScreen } from "@/components/comparison/ProductComparisonScreen";
import { ApiError } from "@/lib/api/client";
import { fetchProductComparisonForRequest } from "@/lib/api/products.server";
import { comparisonHref, comparisonSelectionsOf, type ComparisonSelection } from "@/lib/domain/product-comparison";

/* 회원마다 내 필터 판정이 달라 검색 결과에 낼 내용이 아니다. */
export const metadata: Metadata = {
  title: "제품 비교하기",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

const hasCode = (error: unknown, code: string) => error instanceof ApiError && error.code === code;

/** 없어진 제품이면 화면이 안내하도록 표시만 넘긴다. 없어진 구성품은 호출한 쪽이 첫 구성품으로 되돌린다. 그 밖의 실패는 오류 화면으로 보낸다. */
const load = (selections: readonly ComparisonSelection[]) =>
  fetchProductComparisonForRequest(selections).then(
    ({ items }) => ({ status: "ready", items }) as const,
    (error: unknown) => {
      if (hasCode(error, "PRODUCT_NOT_FOUND")) return { status: "missing-product" } as const;
      if (hasCode(error, "PRODUCT_PART_NOT_FOUND")) return { status: "missing-part" } as const;
      throw error;
    },
  );

/** 제품 비교(시안 v2 V3). 비교할 제품과 구성품은 주소가 정하고, 서버가 그린다. */
export default async function ComparisonResultPage(props: PageProps<"/compare/result">) {
  const selections = comparisonSelectionsOf(await props.searchParams);

  if (selections.length === 0) return <ProductComparisonScreen products={[]} />;
  // 하나로는 비교할 수 없어 그 제품의 상세로 보낸다.
  if (selections.length === 1) redirect(`/products/${selections[0].productId}`);

  const result = await load(selections);

  if (result.status === "missing-part") redirect(comparisonHref(selections.map(({ productId }) => ({ productId }))));
  if (result.status === "missing-product") return <ProductComparisonScreen products={[]} missingProduct />;

  return <ProductComparisonScreen products={result.items} />;
}
