import { describe, expect, it } from "vitest";

import { longestWordWidthEm, pickWidestNames, splitUnbreakableWords } from "./ingredient-tile-name";

describe("splitUnbreakableWords", () => {
  it.each([
    // 실제 이름을 크로미움에서 끊어 본 결과다.
    ["세라마이드에이에스", ["세라마이드에이에스"]],
    ["향료/알레르기 성분", ["향료/", "알레르기", "성분"]],
    ["1,2-헥산다이올", ["1,2-", "헥산다이올"]],
    ["p-아니식애씨드", ["p-", "아니식애씨드"]],
    ["적색103호의(1)", ["적색103호의", "(1)"]],
    ["피이지-40하이드로제네이티드캐스터오일", ["피이지-40하이드로제네이티드캐스터오일"]],
    ["C12-15알킬벤조에이트", ["C12-", "15알킬벤조에이트"]],
    ["아크릴레이트/C10-30알킬아크릴레이트크로스폴리머", ["아크릴레이트/C10-", "30알킬아크릴레이트크로스폴리머"]],
    ["비스(C13-15알콕시)피지-아모다이메티콘", ["비스", "(C13-", "15알콕시)", "피지-", "아모다이메티콘"]],
  ])("%s", (name, words) => {
    expect(splitUnbreakableWords(name)).toEqual(words);
  });
});

describe("2열에 들어가는지", () => {
  // 목록 폭(320 은 296, 390 은 358)에서 타일 사이 8 을 빼 반으로 나누고, 타일 안쪽 여백 24 를 뺀 폭에 한글명(13px)이 들어야 한다.
  const LIST_WIDTH = { 320: 296, 390: 358 } as const;
  const fitsTwoColumns = (name: string, width: keyof typeof LIST_WIDTH, scale: number) =>
    longestWordWidthEm(name) * 13 * scale <= (LIST_WIDTH[width] - 8) / 2 - 24;

  it("'세라마이드에이에스'는 1.0배에서 들어가고 1.5배에서 낱말이 갈라진다", () => {
    expect(fitsTwoColumns("세라마이드에이에스", 390, 1)).toBe(true);
    expect(fitsTwoColumns("세라마이드에이에스", 320, 1)).toBe(true);
    expect(fitsTwoColumns("세라마이드에이에스", 390, 1.5)).toBe(false);
    expect(fitsTwoColumns("세라마이드에이에스", 320, 1.5)).toBe(false);
  });

  it("'향료/알레르기 성분'은 줄을 바꿀 수 있어 2.0배에도 들어간다", () => {
    expect(fitsTwoColumns("향료/알레르기 성분", 320, 2)).toBe(true);
    expect(fitsTwoColumns("향료/알레르기 성분", 390, 2)).toBe(true);
  });

  it("긴 낱말은 1.0배에서도 들어가지 않는다", () => {
    expect(fitsTwoColumns("리놀레아미도프로필피지-다이모늄클로라이드포스페이트", 390, 1)).toBe(false);
    expect(fitsTwoColumns("리놀레아미도프로필피지-다이모늄클로라이드포스페이트", 320, 1)).toBe(false);
  });
});

describe("pickWidestNames", () => {
  it("가장 긴 낱말을 가진 이름을 고르고 짧은 이름은 뺀다", () => {
    expect(pickWidestNames(["세라마이드", "향료/알레르기 성분", "세라마이드에이에스"])).toEqual(["세라마이드에이에스"]);
  });

  it("이름 전체가 길어도 낱말이 짧으면 고르지 않는다", () => {
    expect(pickWidestNames(["나이아신아마이드", "향료/알레르기 성분 추가 설명"])).toEqual(["나이아신아마이드"]);
  });

  it("사파리가 끊지 않는 `-` 이름도 후보에 넣는다", () => {
    expect(pickWidestNames(["가나다라마바사", "2-메틸레조시놀아이소스테아레이트"])).toContain(
      "2-메틸레조시놀아이소스테아레이트",
    );
  });

  it("어림 오차 안에서 비슷한 이름은 모두 남긴다", () => {
    expect(pickWidestNames(["세라마이드에이피", "세라마이드에이에스"])).toEqual([
      "세라마이드에이피",
      "세라마이드에이에스",
    ]);
  });

  it("빈 목록은 빈 목록이다", () => {
    expect(pickWidestNames([])).toEqual([]);
  });
});
