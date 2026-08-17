import { describe, expect, it } from "vitest";

import { choseongOf } from "./choseong";

describe("choseongOf", () => {
  it("첫 글자의 초성을 돌려준다", () => {
    expect(choseongOf("라운드랩")).toBe("ㄹ");
    expect(choseongOf("토리든")).toBe("ㅌ");
    expect(choseongOf("아누아")).toBe("ㅇ");
    expect(choseongOf("에스트라")).toBe("ㅇ");
  });

  it("된소리는 예사소리로 묶는다", () => {
    expect(choseongOf("깨끗한나라")).toBe("ㄱ");
    expect(choseongOf("빠른브랜드")).toBe("ㅂ");
  });

  it("한글이 아니면 빈 문자열을 준다", () => {
    expect(choseongOf("ROUND LAB")).toBe("");
    expect(choseongOf("3CE")).toBe("");
    expect(choseongOf("")).toBe("");
  });

  it("앞뒤 공백을 무시한다", () => {
    expect(choseongOf("  닥터지")).toBe("ㄷ");
  });
});
