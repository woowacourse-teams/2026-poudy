export type IngredientReference = {
  readonly source: string;
  /** 이 자료를 설명의 어느 부분에 썼는지. `배합 목적`, `기대 효과` 또는 둘 다다. */
  readonly usage: string;
};

/**
 * 성분 정보 출처와 효과 출처를 자료 하나에 한 줄로 합친다.
 * 같은 자료가 두 곳에 모두 쓰였으면 두 번 적지 않고 반영한 곳을 함께 적는다.
 */
export const ingredientReferences = (
  infoSources: readonly string[],
  effectSources: readonly string[],
): readonly IngredientReference[] => {
  const effects = new Set(effectSources);
  const infos = new Set(infoSources);

  const infoUsage = (source: string) => {
    if (effects.has(source)) return "배합 목적·기대 효과";
    return "배합 목적";
  };

  return [
    ...[...infos].map((source) => ({ source, usage: infoUsage(source) })),
    ...[...effects].filter((source) => !infos.has(source)).map((source) => ({ source, usage: "기대 효과" })),
  ];
};
