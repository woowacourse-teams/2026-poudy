import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/product/ProductDetail";
import { JsonLd } from "@/components/seo/JsonLd";
import { productEntryPointOf } from "@/lib/analytics/events";
import { ApiError } from "@/lib/api/client";
import { fetchExcludeCodes, fetchProductDetail, fetchProductSimilarities } from "@/lib/api/products";
import { productIngredientDescription } from "@/lib/domain/product-display";
import { markdownAlternates } from "@/lib/seo/markdown";
import { OPEN_GRAPH_BASE } from "@/lib/seo/metadata";
import { SITE_ALTERNATE_NAME, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
import { breadcrumbList, productCrumbs, productStructuredData } from "@/lib/seo/structured-data";

// 성분표는 자주 바뀌지 않고 검색 노출 대상이라 미리 만들어 두고 하루에 한 번 갱신한다.
export const revalidate = 86400;

/** 구성품 탭이 붙이는 `partId` 를 읽는다. 숫자가 아니면 첫 구성품을 보여 준다. */
const partIdOf = (value: unknown): number | undefined => {
  const partId = Number(value);
  if (typeof value !== "string" || !Number.isInteger(partId)) return undefined;
  return partId;
};

/** 없는 제품이나 그 제품에 없는 구성품이면 404 화면을 보여 준다. */
const load = async (raw: string, partId: number | undefined) => {
  const productId = Number(raw);
  if (!Number.isInteger(productId)) notFound();

  try {
    return await fetchProductDetail(productId, partId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
};

/**
 * 성분이 비슷한 제품. 받아 오지 못해도 제품 상세는 그대로 보여 준다. 덧붙이는 정보라 빈 목록으로 대신한다.
 * 제품 상세와 같은 partId 를 넘겨 고른 구성품을 기준으로 받는다.
 */
const loadSimilarProducts = async (raw: string, partId: number | undefined) => {
  const productId = Number(raw);
  if (!Number.isInteger(productId)) return [];

  try {
    return (await fetchProductSimilarities(productId, partId)).items;
  } catch {
    return [];
  }
};

/**
 * 주의 성분 기준의 성분군 코드를 찾는 제외 성분군 목록. 받아 오지 못하면 기준을 누를 수 없게 둘 뿐이라
 * 빈 목록으로 대신한다. 모든 제품이 같은 목록을 쓰므로 카탈로그 캐시를 함께 쓴다.
 */
const loadExcludeCodes = async () => {
  try {
    return (await fetchExcludeCodes()).items;
  } catch {
    return [];
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
    const title = `${product.brand.name} ${product.name} — 성분·가격·제품 정보 | ${SITE_ALTERNATE_NAME}(${SITE_NAME})`;
    // 제품마다 성분 수와 대표 작용이 달라 설명문이 겹치지 않는다.
    const description = productIngredientDescription({
      brandName: product.brand.name,
      productName: product.name,
      ingredientCount: product.selectedPart?.ingredients.length ?? 0,
      effectNames: product.selectedPart?.skinEffectGroups.map((group) => group.name) ?? [],
    });
    const image = product.imageUrl || "/opengraph-image";
    const imageAlt = product.imageUrl ? `${product.brand.name} ${product.name} 제품 이미지` : SITE_DESCRIPTION;
    return {
      title,
      description,
      alternates: markdownAlternates(canonical),
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
  const partId = partIdOf(searchParams.partId);
  // 셋은 서로 기다릴 이유가 없어 함께 받는다.
  const [product, similarProducts, excludeCodes] = await Promise.all([
    load(productId, partId),
    loadSimilarProducts(productId, partId),
    loadExcludeCodes(),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbList(productCrumbs(product))} />
      <JsonLd data={productStructuredData(product)} />
      <ProductDetail
        product={product}
        entryPoint={productEntryPointOf(searchParams.from)}
        similarProducts={similarProducts}
        excludeCodes={excludeCodes}
      />
    </>
  );
}
