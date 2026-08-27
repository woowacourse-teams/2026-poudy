import { describe, expect, it } from "vitest";

import { hasMatch, splitByKeyword, splitByRange } from "./highlight";

const shape = (text: string, keyword: string) =>
  splitByKeyword(text, keyword).map((part) => `${part.text}${part.matched ? "*" : ""}`);

describe("splitByKeyword", () => {
  it("맞는 자리를 앞뒤와 나눈다", () => {
    expect(shape("소듐라우릴설페이트", "설")).toEqual(["소듐라우릴", "설*", "페이트"]);
  });

  it("맨 앞에서 맞으면 앞 토막을 만들지 않는다", () => {
    expect(shape("판테놀", "판테")).toEqual(["판테*", "놀"]);
  });

  it("맨 뒤에서 맞으면 뒤 토막을 만들지 않는다", () => {
    expect(shape("판테놀", "놀")).toEqual(["판테", "놀*"]);
  });

  it("되풀이되는 자리를 모두 나눈다", () => {
    expect(shape("설탕설탕", "설")).toEqual(["설*", "탕", "설*", "탕"]);
  });

  it("맞는 자리가 없으면 통째로 한 토막이다", () => {
    // 서버는 영문 이름까지 합쳐 훑으므로 한글 이름에는 맞는 자리가 없을 수 있다.
    expect(shape("소듐글루코네이트", "sodium")).toEqual(["소듐글루코네이트"]);
  });

  it("대소문자를 가리지 않되 본디 글자를 그대로 남긴다", () => {
    expect(shape("Sodium Gluconate", "sodium")).toEqual(["Sodium*", " Gluconate"]);
  });

  it("검색어가 비었으면 나누지 않는다", () => {
    expect(shape("판테놀", "")).toEqual(["판테놀"]);
    expect(shape("판테놀", "   ")).toEqual(["판테놀"]);
  });

  it("이름 전체가 검색어와 같으면 한 토막이 통째로 맞는다", () => {
    expect(shape("판테놀", "판테놀")).toEqual(["판테놀*"]);
  });

  it("겹쳐 걸리는 자리는 앞의 것만 남겨 토막이 겹치지 않게 한다", () => {
    expect(shape("설설설", "설설")).toEqual(["설설*", "설"]);
  });

  it("긴 이름에서도 끝까지 나눈다", () => {
    const long = "비스-베헤닐/아이소스테아릴/피토스테릴다이머다이리놀레일다이머다이리놀리에이트";
    expect(splitByKeyword(long, "다이머").filter((part) => part.matched)).toHaveLength(2);
    expect(
      splitByKeyword(long, "다이머")
        .map((part) => part.text)
        .join(""),
    ).toBe(long);
  });
});

describe("hasMatch", () => {
  it("맞는 자리가 있으면 참이다", () => {
    expect(hasMatch(splitByKeyword("소듐라우릴설페이트", "설"))).toBe(true);
  });

  it("영문만 맞아 뜬 줄처럼 맞는 자리가 없으면 거짓이다", () => {
    expect(hasMatch(splitByKeyword("소듐글루코네이트", "sodium"))).toBe(false);
  });

  it("검색어가 비면 거짓이다", () => {
    expect(hasMatch(splitByKeyword("판테놀", ""))).toBe(false);
  });
});

const ranged = (text: string, startIndex: number, endIndexExclusive: number) =>
  splitByRange({ text, startIndex, endIndexExclusive }).map((part) => `${part.text}${part.matched ? "*" : ""}`);

describe("splitByRange", () => {
  it("서버가 짚어 준 자리를 앞뒤와 나눈다", () => {
    expect(ranged("소듐라우릴설페이트", 5, 6)).toEqual(["소듐라우릴", "설*", "페이트"]);
  });

  it("맨 앞에서 맞으면 앞 토막을 만들지 않는다", () => {
    expect(ranged("판테놀", 0, 2)).toEqual(["판테*", "놀"]);
  });

  it("맨 뒤에서 맞으면 뒤 토막을 만들지 않는다", () => {
    expect(ranged("판테놀", 2, 3)).toEqual(["판테", "놀*"]);
  });

  it("이름 전체가 맞으면 한 토막이 통째로 맞는다", () => {
    expect(ranged("판테놀", 0, 3)).toEqual(["판테놀*"]);
  });

  it("검색어 글자가 이름에 없어도 짚어 준 자리를 진하게 둔다", () => {
    // 초성 `ㅍㅌㄴ` 으로 걸린 줄. 다시 찾아 나서면 아무 자리도 진해지지 않는다.
    expect(ranged("판테놀", 0, 3)).toEqual(["판테놀*"]);
    expect(splitByKeyword("판테놀", "ㅍㅌㄴ").some((part) => part.matched)).toBe(false);
  });

  it("범위가 글자 밖을 가리키면 나누지 않는다", () => {
    expect(ranged("판테놀", 1, 9)).toEqual(["판테놀"]);
    expect(ranged("판테놀", -1, 2)).toEqual(["판테놀"]);
  });

  it("빈 범위는 나누지 않는다", () => {
    expect(ranged("판테놀", 1, 1)).toEqual(["판테놀"]);
  });

  it("끝이 시작보다 앞이면 나누지 않는다", () => {
    expect(ranged("판테놀", 2, 1)).toEqual(["판테놀"]);
  });

  it("나눈 토막을 이어 붙이면 본디 글자가 된다", () => {
    expect(
      splitByRange({ text: "소듐라우릴설페이트", startIndex: 5, endIndexExclusive: 6 })
        .map((part) => part.text)
        .join(""),
    ).toBe("소듐라우릴설페이트");
  });
});
