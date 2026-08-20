/**
 * 성분 효과 태그 색. BIOLOGICAL_EFFECT 태그마다 다른 색을 쓴다.
 * 응답의 태그 코드(`SkinEffectResponse.code`)로 맵핑한다.
 * 목록에 없는 코드는 회색으로 둔다. 색 값은 design/v1.pen 의 S05 화면을 따른다.
 */
type EffectColor = {
  readonly bg: string;
  readonly text: string;
};

/** 태그 코드별 색. */
const CODE_COLORS = {
  BRIGHTENING_RELATED: { bg: "bg-[#FFF6E8]", text: "text-[#B27A16]" },
  SOOTHING_RELATED: { bg: "bg-[#EAF8F4]", text: "text-[#23876D]" },
  ANTIOXIDANT_RELATED: { bg: "bg-[#F1F0FF]", text: "text-[#635BFF]" },
  BARRIER_SUPPORT_RELATED: { bg: "bg-[#EEF3FF]", text: "text-[#4A6CC7]" },
  EXFOLIATION_RELATED: { bg: "bg-[#FFF3E8]", text: "text-[#B26A2A]" },
  SEBUM_CONTROL_RELATED: { bg: "bg-[#F0F5E9]", text: "text-[#5D8330]" },
  ELASTICITY_RELATED: { bg: "bg-[#FCEFF6]", text: "text-[#B0538C]" },
  WRINKLE_RELATED: { bg: "bg-[#F5EFEA]", text: "text-[#8A6244]" },
  ANTI_INFLAMMATORY_RELATED: { bg: "bg-[#E9F6F7]", text: "text-[#2A8792]" },
  ANTIMICROBIAL_RELATED: { bg: "bg-[#EAF3EE]", text: "text-[#3B8560]" },
  ACNE_RELATED: { bg: "bg-[#FFF0F4]", text: "text-[#D14A6A]" },
  PIGMENTATION_RELATED: { bg: "bg-[#F3EFFB]", text: "text-[#7A5AC2]" },
  HYDRATION_RELATED: { bg: "bg-[#EAF6FC]", text: "text-[#38A6DD]" },
} as const satisfies Record<string, EffectColor>;

export type SkinEffectCode = keyof typeof CODE_COLORS;

const DEFAULT_COLOR: EffectColor = { bg: "bg-surface", text: "text-text-secondary" };

/** 태그가 없는 자리에는 기본 색을 쓴다. */
export const effectColor = (code?: string): EffectColor => {
  if (code === undefined) return DEFAULT_COLOR;

  return CODE_COLORS[code as SkinEffectCode] ?? DEFAULT_COLOR;
};
