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

/**
 * 비율은 정수로 쓴다(명세 S276 '15%'). 어림하다 차이를 부풀리지 않게 소수점은 버리고, 0.x% 처럼 0 이 되면 1 로 둔다.
 * 0 이 되는 경우는 서버가 '동일'로 판정하지 않은 작은 차이라, '0% 저렴'처럼 뜻이 엇갈리는 글자를 남기지 않는다.
 */
export const wholePercent = (percent: number): string => `${formatNumber(Math.max(1, Math.trunc(Math.abs(percent))))}%`;

export type UnitPriceDifference = {
  /** 단가 뒤에 붙는 차이 글자. 예: '15% 저렴', '단위 가격 동일' */
  readonly text: string;
  /** 저렴한 순 행의 앞머리에 쓰는 비율만. 저렴하고 비율을 알 때만 있다. 예: '15%' */
  readonly percent?: string;
  readonly cheaper: boolean;
};

/** 기존 API 응답에 필드가 없거나, 서버가 비교 불가로 판정했을 때 비율을 만들어 내지 않는다. */
export const unitPriceDifference = (product: SimilarProductResponse): UnitPriceDifference => {
  const comparison = product.unitPriceComparison;
  const percent = product.unitPriceDifferencePercent;
  if (!comparison || comparison === "UNAVAILABLE") return { text: "단위 가격 비교 불가", cheaper: false };
  if (comparison === "SAME") return { text: "단위 가격 동일", cheaper: false };

  const cheaper = comparison === "CHEAPER";
  const label = comparisonLabel(comparison);
  if (percent == null) return { text: label, cheaper };
  const whole = wholePercent(percent);
  if (cheaper) return { text: `${whole} ${label}`, percent: whole, cheaper };
  return { text: `${whole} ${label}`, cheaper };
};

const comparisonLabel = (comparison: string): string => {
  if (comparison === "CHEAPER") return "저렴";
  return "비쌈";
};

export const similarUnitPrice = (product: SimilarProductResponse): string | undefined => {
  if (product.unitPrice == null) return undefined;
  return `${product.volumeUnit}당 ${formatPrice(product.unitPrice)}`;
};

/**
 * 목록 끝 각주(명세 S276 · S277). 저렴한 순은 상위 10개 '안에서' 값을 견주고, 성분 유사한 순은 그 10개를 그대로 보여 준다.
 * 둘째 문장은 두 정렬이 같다.
 */
export const similarityFootnote = (sort: ProductSimilaritySort): string => {
  if (sort === "SIMILARITY") return "성분이 비슷한 상위 10개를 보여 줘요.\n가격은 대표 용량 기준이에요.";
  return "성분이 비슷한 상위 10개 안에서 비교해요.\n가격은 대표 용량 기준이에요.";
};
