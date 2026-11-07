import type { ConcernEffectResponse, ConcernGroupResponse, ProductPartResponse } from "@poudy/api/api.zod";

type EffectPart = Readonly<Pick<ProductPartResponse, "concernGroups">> | null;

/** 성분군 안의 성분까지 펼쳐 고민 안에서 중복 없이 센다. */
export const concernIngredientCount = (concern: Readonly<ConcernGroupResponse>): number =>
  new Set(
    concern.items.flatMap((item) => {
      if (item.type === "INGREDIENT") return [item.id];
      return item.ingredients.map((ingredient) => ingredient.id);
    }),
  ).size;

/** SEO에는 성분 칩 변환 없이 효능명만 제공한다. */
export const productEffectNames = (part: EffectPart): readonly string[] => {
  if (!part) return [];
  return uniqueConcernEffects(part.concernGroups).map((effect) => effect.name);
};

export const uniqueConcernEffects = (concerns: readonly ConcernGroupResponse[]): readonly ConcernEffectResponse[] => {
  const effects = concerns.flatMap((concern) => concern.effects);
  return effects.filter((effect, index) => effects.findIndex((candidate) => candidate.code === effect.code) === index);
};
