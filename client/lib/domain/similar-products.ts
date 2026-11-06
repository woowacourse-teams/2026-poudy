import type { ProductSimilaritySort, SimilarProductResponse } from "@poudy/api/api.zod";

import { formatNumber, formatPrice } from "./format";

export const SIMILAR_PRODUCTS_PATH = "/similar-products";
export const SIMILAR_PRODUCTS_LIMIT = 10;
export const DEFAULT_SIMILARITY_SORT: ProductSimilaritySort = "UNIT_PRICE_ASC";

export const similaritySortOf = (value: unknown): ProductSimilaritySort => {
  if (value === "SIMILARITY") return value;
  return DEFAULT_SIMILARITY_SORT;
};

export const similarProductsHref = (
  productId: number,
  partId?: number,
  sort: ProductSimilaritySort = DEFAULT_SIMILARITY_SORT,
): string => {
  if (partId === undefined) return `${SIMILAR_PRODUCTS_PATH}/${productId}?${new URLSearchParams({ sort })}`;
  const query = new URLSearchParams({ sort, partId: String(partId) });
  return `${SIMILAR_PRODUCTS_PATH}/${productId}?${query}`;
};

/** 기존 API 응답에 필드가 없거나, 서버가 비교 불가로 판정했을 때 비율을 만들어 내지 않는다. */
export const unitPriceDifference = (product: SimilarProductResponse) => {
  const comparison = product.unitPriceComparison;
  const percent = product.unitPriceDifferencePercent;
  if (!comparison || comparison === "UNAVAILABLE") return { text: "단위 가격 비교 불가", cheaper: false };
  if (comparison === "SAME") return { text: "단위 가격 동일", cheaper: false };

  const cheaper = comparison === "CHEAPER";
  const label = comparisonLabel(comparison);
  if (percent == null) return { text: label, cheaper };
  return { text: `${formatNumber(Math.abs(percent))}% ${label}`, cheaper };
};

const comparisonLabel = (comparison: string): string => {
  if (comparison === "CHEAPER") return "저렴";
  return "비쌈";
};

export const similarUnitPrice = (product: SimilarProductResponse): string | undefined => {
  if (product.unitPrice == null) return undefined;
  return `${product.volumeUnit}당 ${formatPrice(product.unitPrice)}`;
};
