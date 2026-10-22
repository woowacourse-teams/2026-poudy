import { describe, expect, it } from "vitest";

import { sensitiveSkinOf, sensitivityOf, skinSummaryOf } from "./member-profile";

describe("피부 타입 요약", () => {
  it("피부 타입만 고르면 그 이름을 보여 준다", () => {
    expect(skinSummaryOf({ skinType: "COMBINATION", sensitiveSkin: false })).toBe("복합성");
  });

  it("민감하다고 답했으면 피부 타입 뒤에 붙인다", () => {
    expect(skinSummaryOf({ skinType: "DRY", sensitiveSkin: true })).toBe("건성 · 민감성");
    expect(skinSummaryOf({ skinType: null, sensitiveSkin: true })).toBe("민감성");
  });

  it("아무것도 고르지 않았으면 값이 없다", () => {
    expect(skinSummaryOf({ skinType: null, sensitiveSkin: null })).toBeUndefined();
    expect(skinSummaryOf({ skinType: null, sensitiveSkin: false })).toBeUndefined();
  });
});

describe("민감성 여부", () => {
  it("저장된 값과 고르는 값을 서로 바꾼다", () => {
    expect(sensitivityOf(true)).toBe("SENSITIVE");
    expect(sensitivityOf(false)).toBe("NOT_SENSITIVE");
    expect(sensitivityOf(null)).toBeNull();
    expect(sensitiveSkinOf("SENSITIVE")).toBe(true);
    expect(sensitiveSkinOf("NOT_SENSITIVE")).toBe(false);
    expect(sensitiveSkinOf(null)).toBeNull();
  });
});
