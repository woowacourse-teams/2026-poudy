import { describe, expect, it } from "vitest";

import { isChosung, matchesKeyword, toChosung } from "./chosung";

describe("toChosung", () => {
  it("한글 음절을 초성으로 바꾸고 나머지는 공백으로 둔다", () => {
    expect(toChosung("판테놀")).toBe("ㅍㅌㄴ");
    expect(toChosung("독도 토너")).toBe("ㄷㄷ ㅌㄴ");
    expect(toChosung("PDRN 토너")).toBe("     ㅌㄴ");
  });
});

describe("isChosung", () => {
  it("초성만으로 쓰인 것을 가린다", () => {
    expect(isChosung("ㅍㅌㄴ")).toBe(true);
    expect(isChosung("판테놀")).toBe(false);
    expect(isChosung("pdrn")).toBe(false);
    expect(isChosung("")).toBe(false);
  });
});

describe("matchesKeyword", () => {
  it("초성으로 이름을 찾는다", () => {
    expect(matchesKeyword("ㅍㅌㄴ", "판테놀")).toBe(true);
    expect(matchesKeyword("ㄷㄷ", "1025 독도 토너")).toBe(true);
  });

  it("초성이 이어지지 않으면 걸리지 않는다", () => {
    expect(matchesKeyword("ㅍㄴㅌ", "판테놀")).toBe(false);
  });

  it("낱자 하나는 쌍자음도 함께 찾는다", () => {
    expect(matchesKeyword("ㄱ", "까페")).toBe(true);
  });

  it("쌍자음을 직접 치면 그 자음만 걸린다", () => {
    expect(matchesKeyword("ㄲ", "까페")).toBe(true);
    expect(matchesKeyword("ㄲ", "가페")).toBe(false);
  });

  it("초성이 아니면 글자 그대로 견준다", () => {
    expect(matchesKeyword("판테", "판테놀")).toBe(true);
    expect(matchesKeyword("panthenol", "판테놀", "Panthenol")).toBe(true);
  });

  it("검색어가 비면 모두 걸린다", () => {
    expect(matchesKeyword("", "무엇이든")).toBe(true);
  });
});

describe("라틴 음차", () => {
  it("두문자 이름을 한글 읽기로 찾는다", () => {
    expect(matchesKeyword("피디알엔", "PDRN 핑크 시카 수딩 토너")).toBe(true);
  });

  it("원표기로도 그대로 찾는다", () => {
    expect(matchesKeyword("pdrn", "PDRN 핑크 시카 수딩 토너")).toBe(true);
  });

  it("긴 라틴 단어는 낱자로 읽지 않는다", () => {
    // `Whey` 를 `더블유에이치이와이` 로 읽으면 엉뚱한 검색어에 걸린다.
    expect(matchesKeyword("더블유에이치이와이", "Whey Protein")).toBe(false);
  });

  it("한글이 없는 이름은 읽지 않는다", () => {
    expect(matchesKeyword("에이비씨", "ABC Cream")).toBe(false);
  });
});
