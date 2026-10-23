export type IngredientReference = {
  readonly source: string;
  /** 이 자료를 설명의 어느 부분에 썼는지. `배합 목적`, `기대 효과` 또는 둘 다다. */
  readonly usage: string;
};

/** 내부 ID를 외부 사전의 레코드 번호로 추측하지 않고, 인용된 이름으로 검색한다. */
export const ingredientReferenceHref = (source: string): string | undefined => {
  const name = source.match(/^대한화장품협회 성분사전 「([^」]+)」/)?.[1];
  if (!name) return undefined;
  return `https://kcia.or.kr/cid/search/ingd_list.php?${new URLSearchParams({ skind: "ALL", sword: `"${name}"` })}`;
};

const CLASSIFICATION_NOTES = new Set([
  "피부 컨디셔닝 기능이 설명·근거에 명시됨",
  "식물·해조류 등 유래 추출·수 원료 정보",
]);

const referenceLabel = (source: string): string =>
  source.replace(/^(대한화장품협회 성분사전 「[^」]+」)\(성분코드 \d+\)$/, "$1");

/**
 * 성분 정보 출처와 효과 출처를 자료 하나에 한 줄로 합친다.
 * 같은 자료가 두 곳에 모두 쓰였으면 두 번 적지 않고 반영한 곳을 함께 적는다.
 */
export const ingredientReferences = (
  infoSources: readonly string[],
  effectSources: readonly string[],
): readonly IngredientReference[] => {
  const effects = new Set(effectSources.filter((source) => !CLASSIFICATION_NOTES.has(source)).map(referenceLabel));
  const infos = new Set(infoSources.filter((source) => !CLASSIFICATION_NOTES.has(source)).map(referenceLabel));

  const infoUsage = (source: string) => {
    if (effects.has(source)) return "성분 정보·피부 작용 분류";
    return "성분 정보";
  };

  return [
    ...[...infos].map((source) => ({ source, usage: infoUsage(source) })),
    ...[...effects].filter((source) => !infos.has(source)).map((source) => ({ source, usage: "피부 작용 분류" })),
  ];
};
