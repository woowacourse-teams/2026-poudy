import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product/ProductDetail";
import { productEntryPointOf } from "@/lib/analytics/events";
import { ApiError } from "@/lib/api/client";
import { fetchProductDetail } from "@/lib/api/products";
import { ingredientSummary } from "@/lib/domain/product-display";

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
    const title = `${product.brand.name} ${product.name} 전성분`;
    // 제품마다 성분 수와 대표 작용이 달라 설명문이 겹치지 않는다. 본문 `성분 정보` 와 같은 문장이다.
    const summary = ingredientSummary(
      product.ingredients.length,
      product.skinEffectGroups.map((group) => group.name),
    );
    const description = `${product.brand.name} ${product.name}의 전성분을 확인하세요. ${summary}`;
    const image = product.imageUrl || "/opengraph-image";
    return {
      title,
      description,
      alternates: { canonical: `/products/${productId}` },
      openGraph: { title, description, type: "website", images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  } catch {
    return {};
  }
}

export default async function ProductDetailPage(props: PageProps<"/products/[productId]">) {
  const { productId } = await props.params;
  const searchParams = (await props.searchParams) ?? {};
  const product = await load(productId);

  return <ProductDetail product={product} entryPoint={productEntryPointOf(searchParams.from)} />;
}
