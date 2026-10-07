import { describe, expect, it } from "vitest";

import { cautionSummary, sortedCautions } from "./caution-check";

const groups = [
  { name: "건조 알코올", contains: false },
  { name: "향료/알레르기 성분", contains: true },
  { name: "설페이트 성분", contains: false },
  { name: "합성 색소", contains: true },
];

describe("cautionSummary", () => {
  it("들어 있는 기준이 있으면 전체 중 몇 개인지 알린다", () => {
    expect(cautionSummary(groups)).toEqual({ contains: true, label: "4개 중 2개 포함" });
  });

  it("들어 있는 기준이 없으면 모두 없다고 알린다", () => {
    expect(cautionSummary(groups.map((group) => ({ ...group, contains: false })))).toEqual({
      contains: false,
      label: "4개 모두 없음",
    });
  });
});

describe("sortedCautions", () => {
  it("들어 있는 기준을 앞에 두고 같은 쪽끼리는 받은 순서를 지킨다", () => {
    expect(sortedCautions(groups).map((group) => group.name)).toEqual([
      "향료/알레르기 성분",
      "합성 색소",
      "건조 알코올",
      "설페이트 성분",
    ]);
  });
});
