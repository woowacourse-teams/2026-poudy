/**
 * 성분 효과 태그 색. BIOLOGICAL_EFFECT 태그마다 다른 색을 쓴다.
 * API 는 코드가 아니라 한글 이름(`SkinEffectResponse.name`)만 주므로 이름으로 맵핑한다.
 * 목록에 없는 효과는 회색으로 둔다. 색 값은 design/v1.pen 의 S05 화면을 따른다.
 */
type EffectColor = {
  readonly bg: string;
  readonly text: string;
};

/** 태그 코드별 색. 이름 맵을 만드는 근거로 남겨 둔다. */
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

/**
 * 태그 코드가 화면에 내려오는 한글 이름. 표기가 흔들릴 수 있어 별칭까지 함께 둔다.
 * (예: HYDRATION_RELATED 은 태그표에서 "수분", 디자인에서는 "보습" 으로 쓴다.)
 */
export const SKIN_EFFECT_NAMES: Record<SkinEffectCode, readonly string[]> = {
  BRIGHTENING_RELATED: ["미백"],
  SOOTHING_RELATED: ["진정"],
  ANTIOXIDANT_RELATED: ["항산화"],
  BARRIER_SUPPORT_RELATED: ["피부 장벽", "장벽"],
  EXFOLIATION_RELATED: ["각질 관리", "각질 케어", "각질"],
  SEBUM_CONTROL_RELATED: ["피지 조절", "피지"],
  ELASTICITY_RELATED: ["탄력"],
  WRINKLE_RELATED: ["주름"],
  ANTI_INFLAMMATORY_RELATED: ["항염"],
  ANTIMICROBIAL_RELATED: ["항균 작용", "항균"],
  ACNE_RELATED: ["여드름"],
  PIGMENTATION_RELATED: ["색소 침착", "색소"],
  HYDRATION_RELATED: ["수분", "보습"],
};

const COLORS: Record<string, EffectColor> = Object.fromEntries(
  Object.entries(SKIN_EFFECT_NAMES).flatMap(([code, names]) =>
    names.map((name) => [name, CODE_COLORS[code as SkinEffectCode]]),
  ),
);

const DEFAULT_COLOR: EffectColor = { bg: "bg-surface", text: "text-text-secondary" };

export const effectColor = (name: string): EffectColor => COLORS[name] ?? DEFAULT_COLOR;
