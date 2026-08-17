import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product/ProductDetail";
import { ApiError } from "@/lib/api/client";
import { fetchProductDetail } from "@/lib/api/products";

// 성분표는 자주 바뀌지 않고 검색 노출 대상이라 미리 만들어 두고 하루에 한 번 갱신한다.
export const revalidate = 86400;

/** 없는 제품이면 404 화면을 보여 준다. */
const load = async (raw: string) => {
  const productId = Number(raw);
  if (!Number.isInteger(productId)) notFound();

  try {
    return await fetchProductDetail(productId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
};

export async function generateMetadata(props: PageProps<"/products/[productId]">): Promise<Metadata> {
  const { productId } = await props.params;

  // 메타데이터는 렌더링 경로 밖이라 여기서 notFound() 를 부르지 않는다.
  // 없는 제품 판정은 페이지 컴포넌트가 맡는다.
  try {
    const product = await fetchProductDetail(Number(productId));
    return {
      title: `${product.brand.name} ${product.name} 전성분`,
      description: `${product.name}의 전체 성분과 기능별 성분을 확인합니다.`,
    };
  } catch {
    return {};
  }
}

export default async function ProductDetailPage(props: PageProps<"/products/[productId]">) {
  const { productId } = await props.params;
  const product = await load(productId);

  return <ProductDetail product={product} />;
}
