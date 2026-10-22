import { withJosa } from "./format";
import { pick } from "./optional";

/** 유수분(수분감·유분감) 0~3 단계의 표시 이름. 디자인의 유수분 시트와 같다. */
export const LEVEL_LABELS = ["없음", "낮음", "보통", "높음"] as const;

/** 단계 이름. 서버는 0.5 단위로 주므로 가까운 단계로 반올림한다(1.5 는 보통). */
export const levelLabel = (level: number): string => {
  const step = Math.round(level);
  return pick(step in LEVEL_LABELS, LEVEL_LABELS[step], LEVEL_LABELS[0]);
};

/** 유수분 레벨을 물방울 아이콘 3 칸의 채움 여부로 바꾼다. 0 단계면 모두 빈 칸이다. */
export const dropletFills = (level: number, total = 3): readonly boolean[] =>
  Array.from({ length: total }, (_, index) => index < level);

const ingredientSentence = (product: string, ingredientCount: number, effects: readonly string[]): string => {
  if (effects.length === 0) return `${product}의 전성분 ${ingredientCount}개를 확인해 보세요.`;
  return `${product}의 전성분 ${ingredientCount}개와 ${effects.join("·")} 관련 성분을 확인해 보세요.`;
};

/**
 * 검색 결과에 쓰도록 전성분 수, 대표 분류, 들어 있는 주의 성분을 간결하게 담은 제품별 설명.
 * 주의 성분은 들어 있을 때만 적는다. 없다고 쓰면 등록된 전성분이 정확하다는 전제의 '무첨가' 주장처럼 읽힌다.
 */
export const productIngredientDescription = ({
  brandName,
  productName,
  ingredientCount,
  effectNames,
  cautionNames,
}: {
  readonly brandName: string;
  readonly productName: string;
  readonly ingredientCount: number;
  readonly effectNames: readonly string[];
  readonly cautionNames: readonly string[];
}): string => {
  // '광노화 관련'처럼 이름이 이미 '관련'으로 끝나는 분류가 있어, 문장의 '관련'과 겹치지 않게 뗀다.
  const effects = [...new Set(effectNames.map((name) => name.replace(/\s*관련$/, "")))].slice(0, 2);
  const sentence = ingredientSentence(`${brandName} ${productName}`, ingredientCount, effects);

  if (cautionNames.length === 0) return sentence;
  return `${sentence} 주의 성분 중 ${withJosa(cautionNames.join("·"), "이/가")} 들어 있어요.`;
};
