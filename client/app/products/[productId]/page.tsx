import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product/ProductDetail";
import { productEntryPointOf } from "@/lib/analytics/events";
import { ApiError } from "@/lib/api/client";
import { fetchProductDetail } from "@/lib/api/products";
import { productIngredientDescription } from "@/lib/domain/product-display";
import { OPEN_GRAPH_BASE } from "@/lib/seo/metadata";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

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
  // 조회에 실패해도 canonical 은 남긴다. 비워 두면 유입 경로가 붙은 주소가 저마다 원본 행세를 한다.
  const canonical = `/products/${productId}`;

  try {
    const product = await fetchProductDetail(Number(productId));
    const title = `${product.brand.name} ${product.name} 전성분`;
    // 제품마다 성분 수와 대표 작용이 달라 설명문이 겹치지 않는다.
    const description = productIngredientDescription({
      brandName: product.brand.name,
      productName: product.name,
      ingredientCount: product.ingredients.length,
      effectNames: product.skinEffectGroups.map((group) => group.name),
    });
    const image = product.imageUrl || "/opengraph-image";
    const imageAlt = product.imageUrl ? `${product.brand.name} ${product.name} 제품 이미지` : SITE_DESCRIPTION;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { ...OPEN_GRAPH_BASE, title, description, url: canonical, images: [{ url: image, alt: imageAlt }] },
      twitter: { card: "summary_large_image", title, description, images: [{ url: image, alt: imageAlt }] },
    };
  } catch {
    return { alternates: { canonical } };
  }
}

export default async function ProductDetailPage(props: PageProps<"/products/[productId]">) {
  const { productId } = await props.params;
  const searchParams = (await props.searchParams) ?? {};
  const product = await load(productId);

  return <ProductDetail product={product} entryPoint={productEntryPointOf(searchParams.from)} />;
}
