/**
 * 디자인의 기능 태그 색. 효과마다 다른 색을 쓴다.
 * 목록에 없는 효과는 회색으로 둔다.
 */
type EffectColor = {
  readonly bg: string;
  readonly text: string;
};

const COLORS: Record<string, EffectColor> = {
  보습: { bg: "bg-[#EAF6FC]", text: "text-[#38A6DD]" },
  진정: { bg: "bg-[#EAF8F4]", text: "text-[#23876D]" },
  "각질 케어": { bg: "bg-[#FFF3E8]", text: "text-[#B26A2A]" },
};

const DEFAULT_COLOR: EffectColor = { bg: "bg-surface", text: "text-text-secondary" };

export const effectColor = (name: string): EffectColor => COLORS[name] ?? DEFAULT_COLOR;
