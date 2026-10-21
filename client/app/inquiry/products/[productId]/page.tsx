import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CorrectionScreen } from "@/components/inquiry/CorrectionScreen";
import { ApiError } from "@/lib/api/client";
import { fetchProductDetail } from "@/lib/api/products";

export const metadata: Metadata = {
  title: "제품 정보 정정",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

/**
 * 제품 정보 정정(명세 S40e). 대상 제품이 경로에 있으므로 쿼리 파라미터를 두지 않는다.
 * 없는 제품이면 동적 세그먼트를 처리하는 기존 방식대로 404 가 된다.
 */
export default async function ProductCorrectionPage(props: PageProps<"/inquiry/products/[productId]">) {
  const { productId } = await props.params;

  const id = Number(productId);
  if (!Number.isInteger(id)) notFound();

  const product = await fetchProductDetail(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <CorrectionScreen
      productId={id}
      brandName={product.brand.name}
      productName={product.name}
      imageUrl={product.imageUrl}
    />
  );
}
