import { describe, expect, it } from "vitest";

import { ingredientSummary } from "./ProductDetail";

describe("제품 성분 요약", () => {
  it("피부 작용 태그가 없으면 전성분 수만 안내한다", () => {
    expect(ingredientSummary(24, [])).toBe("24개 전성분으로 이루어진 제품이에요.");
  });

  it("피부 작용 태그가 하나면 함께라는 표현을 쓰지 않는다", () => {
    expect(ingredientSummary(24, ["수분"])).toBe("24개 전성분을 기준으로, 수분 성분을 담은 구성입니다.");
  });

  it("피부 작용 태그가 둘 이상이면 앞의 두 종류를 함께 안내한다", () => {
    expect(ingredientSummary(24, ["수분", "진정", "미백"])).toBe(
      "24개 전성분을 기준으로, 수분 성분과 진정 성분을 함께 담은 구성입니다.",
    );
  });
});
