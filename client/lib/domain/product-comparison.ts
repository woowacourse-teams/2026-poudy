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
