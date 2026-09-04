import { describe, expect, it } from "vitest";

import { brandNameError, contentError, productNameError } from "./inquiry-validation";

describe("문의 내용 검사", () => {
  it("아직 적지 않은 칸은 잘못으로 보지 않는다", () => {
    expect(contentError("")).toBeUndefined();
    expect(contentError("   ")).toBeUndefined();
  });

  it("열 자에 미치지 못하면 몇 자인지 알린다", () => {
    expect(contentError("짧아요")).toBe("10자 이상 적어주세요. 지금 3자예요.");
  });

  it("앞뒤 공백은 길이에서 뺀다", () => {
    expect(contentError("   짧아요   ")).toBe("10자 이상 적어주세요. 지금 3자예요.");
  });

  it("열 자를 채우면 잘못이 없다", () => {
    expect(contentError("열 자가 넘는 내용입니다")).toBeUndefined();
  });

  it("2,000자를 넘으면 알린다", () => {
    expect(contentError("가".repeat(2001))).toBe("2,000자까지 적을 수 있어요.");
  });
});

describe("제품명 검사", () => {
  it("아직 적지 않은 칸은 잘못으로 보지 않는다", () => {
    expect(productNameError("")).toBeUndefined();
  });

  it("200자까지 받는다", () => {
    expect(productNameError("가".repeat(200))).toBeUndefined();
    expect(productNameError("가".repeat(201))).toBe("200자까지 적을 수 있어요.");
  });
});

describe("브랜드 검사", () => {
  it("선택 사항이므로 비어 있어도 잘못이 아니다", () => {
    expect(brandNameError("")).toBeUndefined();
    expect(brandNameError("   ")).toBeUndefined();
  });

  it("100자까지 받는다", () => {
    expect(brandNameError("가".repeat(100))).toBeUndefined();
    expect(brandNameError("가".repeat(101))).toBe("100자까지 적을 수 있어요.");
  });
});
