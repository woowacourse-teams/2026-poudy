import type { ExcludeGroupResponse } from "@poudy/api/api.zod";

export type CautionSummary = {
  /** 기준 가운데 하나라도 들어 있는지. 머리 문구의 색을 정한다. */
  readonly contains: boolean;
  readonly label: string;
};

/** 주의 성분 확인 머리의 오른쪽 문구. 들어 있는 기준이 없으면 모두 없다고 알린다. */
export const cautionSummary = (groups: readonly ExcludeGroupResponse[]): CautionSummary => {
  const containedCount = groups.filter((group) => group.contains).length;

  if (containedCount === 0) return { contains: false, label: `${groups.length}개 모두 없음` };
  return { contains: true, label: `${groups.length}개 중 ${containedCount}개 포함` };
};

/** 들어 있는 기준을 앞에 둔다. 같은 쪽끼리는 서버가 준 순서를 지킨다. */
export const sortedCautions = (groups: readonly ExcludeGroupResponse[]): readonly ExcludeGroupResponse[] => [
  ...groups.filter((group) => group.contains),
  ...groups.filter((group) => !group.contains),
];
