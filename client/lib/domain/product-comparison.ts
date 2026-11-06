import type { ProductComparisonItemResponse, ProductComparisonPartResponse } from "@poudy/api/api.zod";

type Variant = ProductComparisonItemResponse["variants"][number];
type Mark = ProductComparisonItemResponse["marks"][number];

/** 다이소는 판매처 표시라 제품 속성 줄에 넣지 않는다. 사진 위 배지도 이번 시안에서 뺐다(시안 v2 메모). */
const NOT_ATTRIBUTE_MARKS: ReadonlySet<string> = new Set(["DAISO"]);

/** 대표 용량. 판매 중인 첫 옵션이고, 모두 단종이면 첫 옵션이다. */
export const representativeVariant = (variants: readonly Variant[]): Variant | undefined =>
  variants.find((variant) => variant.status === "active") ?? variants[0];

/** 제품 속성 줄에 보일 표식. 자외선 차단 유형, 세정 용이성, 내수성이다. */
export const attributeMarks = (marks: readonly Mark[]): readonly Mark[] =>
  marks.filter((mark) => !NOT_ATTRIBUTE_MARKS.has(mark.code));

/** 제품에 든 주의 성분군의 이름. 6가지를 한 줄로 합쳐 든 것만 보인다. */
export const containedCautionNames = (part: ProductComparisonPartResponse): readonly string[] =>
  part.cautionGroups.filter((group) => group.contains).map((group) => group.name);

/**
 * 나만의 필터 줄을 보일지. 로그인 전이거나 피할 성분을 저장하지 않았으면 판정할 것이 없어 줄째 숨긴다.
 * 구성품이 없는 제품만으로는 줄을 만들지 않는다.
 */
export const hasMyFilterVerdict = (parts: readonly (ProductComparisonPartResponse | null)[]): boolean =>
  parts.some((part) => part?.myFilterStatus === "MATCH" || part?.myFilterStatus === "NO_MATCH");

/** 구성품 이름. 서버는 구성품이 하나뿐일 때 이름을 비우므로, 이름이 없으면 순서로 부른다. */
export const comparisonPartName = (name: string | null, index: number): string => name ?? `구성 ${index + 1}`;

/** 제품 비교 화면의 주소(시안 v2 V3). */
export const COMPARISON_RESULT_PATH = "/compare/result";

/** 한 번에 비교할 수 있는 제품 수. 서버의 비교 API 제한(`productIds` 최대 3개)과 같다. */
export const COMPARISON_MAX = 3;

export type ComparisonSelection = {
  readonly productId: number;
  readonly partId?: number;
};

const partParamOf = ({ productId, partId }: ComparisonSelection): readonly string[] => {
  if (partId === undefined) return [];
  return [`${encodeURIComponent(`partIds[${productId}]`)}=${partId}`];
};

/** 비교 화면의 주소. 고른 제품과 구성품을 주소에 담아 서버가 그리고, 주소만으로 같은 비교를 다시 열 수 있다. */
export const comparisonHref = (selections: readonly ComparisonSelection[]): string => {
  if (selections.length === 0) return COMPARISON_RESULT_PATH;
  const ids = selections.map(({ productId }) => productId).join(",");
  return `${COMPARISON_RESULT_PATH}?${[`productIds=${ids}`, ...selections.flatMap(partParamOf)].join("&")}`;
};

const firstOf = (value: string | readonly string[] | undefined): string | undefined => {
  if (typeof value === "string") return value;
  return value?.[0];
};

const positiveIntegerOf = (value: string | undefined): number | undefined => {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) return undefined;
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return undefined;
  return number;
};

/** 주소에서 비교할 제품과 구성품을 읽는다. 알아볼 수 없는 값과 중복은 빼고, 앞에서부터 최대 개수까지만 쓴다. */
export const comparisonSelectionsOf = (
  searchParams: Readonly<Record<string, string | readonly string[] | undefined>>,
): readonly ComparisonSelection[] => {
  const ids = (firstOf(searchParams.productIds) ?? "").split(",").flatMap((value) => positiveIntegerOf(value) ?? []);
  return [...new Set(ids)].slice(0, COMPARISON_MAX).map((productId) => {
    const partId = positiveIntegerOf(firstOf(searchParams[`partIds[${productId}]`]));
    if (partId === undefined) return { productId };
    return { productId, partId };
  });
};
