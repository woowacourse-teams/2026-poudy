import { firstOf, keepIf, pick } from "./optional";

/** 유수분(수분감·유분감) 0~3 단계의 표시 이름. 디자인의 유수분 시트와 같다. */
export const LEVEL_LABELS = ["없음", "낮음", "보통", "높음"] as const;

export type Volume = {
  readonly volumeValue: number;
  readonly volumeUnit: string;
};

export const formatPrice = (price: number): string => `${price.toLocaleString("ko-KR")}원`;

export const formatVolume = ({ volumeValue, volumeUnit }: Volume): string => `${volumeValue}${volumeUnit}`;

/**
 * 단위당 가격은 API 에 없어서 계산한다. 표시 전용이며 정렬이나 필터에는 쓰지 않는다.
 * 정렬에 필요해지면 서버에 요청한다.
 */
export const unitPrice = (price: number, { volumeValue }: Volume): number | undefined => {
  const usable = Number.isFinite(volumeValue) && volumeValue > 0;
  return firstOf(keepIf(usable, Math.round(price / volumeValue)), undefined);
};

/** 디자인의 `200ml · ml당 90원`. 용량을 알 수 없으면 단가를 빼고 보여준다. */
export const formatVolumeWithUnitPrice = (price: number, volume: Volume): string => {
  const perUnit = unitPrice(price, volume);
  const suffix = keepIf(perUnit !== undefined, ` · ${volume.volumeUnit}당 ${perUnit?.toLocaleString("ko-KR")}원`);
  return `${formatVolume(volume)}${firstOf(suffix, "")}`;
};

export const levelLabel = (level: number): string => pick(level in LEVEL_LABELS, LEVEL_LABELS[level], LEVEL_LABELS[0]);

/** 유수분 레벨을 물방울 아이콘 3 칸의 채움 여부로 바꾼다. 0 단계면 모두 빈 칸이다. */
export const dropletFills = (level: number, total = 3): readonly boolean[] =>
  Array.from({ length: total }, (_, index) => index < level);

/** 제품 상세 `성분 정보` 의 한 줄 요약. 검색 설명문도 같은 문장을 쓴다. */
export const ingredientSummary = (ingredientCount: number, effectNames: readonly string[]): string => {
  const effects = [...new Set(effectNames)].slice(0, 2).map((name) => `${name} 성분`);

  if (effects.length === 0) return `${ingredientCount}개 전성분으로 이루어진 제품이에요.`;
  if (effects.length === 1) return `${ingredientCount}개 전성분을 기준으로, ${effects[0]}을 담은 구성입니다.`;
  return `${ingredientCount}개 전성분을 기준으로, ${effects.join("과 ")}을 함께 담은 구성입니다.`;
};

/** 검색 결과에 쓰도록 전성분 수와 대표 분류를 간결하게 담은 제품별 설명. */
export const productIngredientDescription = ({
  brandName,
  productName,
  ingredientCount,
  effectNames,
}: {
  readonly brandName: string;
  readonly productName: string;
  readonly ingredientCount: number;
  readonly effectNames: readonly string[];
}): string => {
  const effects = [...new Set(effectNames)].slice(0, 2);

  if (effects.length === 0) return `${brandName} ${productName}의 전성분 ${ingredientCount}개를 확인하세요.`;
  return `${brandName} ${productName}의 전성분 ${ingredientCount}개와 ${effects.join("·")} 관련 성분을 확인하세요.`;
};
