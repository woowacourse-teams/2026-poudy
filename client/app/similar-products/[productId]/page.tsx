import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SimilarProductsResult } from "@/components/similar-products/SimilarProductsResult";
import { ApiError } from "@/lib/api/client";
import { fetchProductDetail, fetchProductSimilarities } from "@/lib/api/products";
import { SIMILAR_PRODUCTS_LIMIT, similaritySortOf } from "@/lib/domain/similar-products";

export const metadata: Metadata = {
  title: "유사템 찾기 | 성분·단위 가격 비교",
  description: "성분이 비슷한 제품을 최대 10개 비교하고 단위 가격과 성분 유사도 순으로 살펴보세요.",
  robots: { index: false, follow: true },
};

export default async function SimilarProductsPage(props: PageProps<"/similar-products/[productId]">) {
  const { productId: rawId } = await props.params;
  const { partId: rawPartId, sort: rawSort } = await props.searchParams;
  const productId = Number(rawId);
  const partId = rawPartId === undefined ? undefined : Number(rawPartId);
  if (!Number.isSafeInteger(productId) || productId <= 0) notFound();
  if (rawPartId !== undefined && (typeof rawPartId !== "string" || !Number.isSafeInteger(partId) || partId! <= 0)) {
    notFound();
  }
  const sort = similaritySortOf(rawSort);

  const [product, response] = await Promise.all([
    fetchProductDetail(productId, partId),
    fetchProductSimilarities(productId, partId, { size: SIMILAR_PRODUCTS_LIMIT, sort }).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) throw error;
      return null;
    }),
  ]).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  return <SimilarProductsResult key={product.id} product={product} response={response} sort={sort} />;
}
