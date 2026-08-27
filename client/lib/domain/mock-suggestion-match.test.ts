import { describe, expect, it } from "vitest";

const get = async (path: string) => (await fetch(`http://localhost/api${path}`)).json();

type Suggestion = {
  readonly match: { readonly text: string; readonly startIndex: number; readonly endIndexExclusive: number };
};

/** 짚어 준 구간을 실제로 잘라 본다. 인덱스가 어긋나면 여기서 드러난다. */
const sliced = (item: Suggestion) => item.match.text.slice(item.match.startIndex, item.match.endIndexExclusive);

const suggest = async (keyword: string) =>
  (await get(`/ingredients/suggestions?keyword=${encodeURIComponent(keyword)}`)).items;

describe("성분 제안의 일치 구간", () => {
  it("글자로 걸린 줄은 그 글자만 짚는다", async () => {
    const [first] = await suggest("글리");

    expect(first.match.field).toBe("KOREAN_NAME");
    expect(sliced(first)).toBe("글리");
  });

  it("초성으로 걸린 줄은 초성이 맞은 구간만 짚는다", async () => {
    // `프로판다이올` 의 초성은 `ㅍㄹㅍㄷㅇㅇ` 이라 `ㅍㄷㅇㅇ` 는 `판다이올` 이다.
    const items = await suggest("ㅍㄷㅇㅇ");

    expect(items.length).toBeGreaterThan(0);
    expect(sliced(items[0])).toBe("판다이올");
  });

  it("초성으로 걸려도 이름 전체를 짚지 않는다", async () => {
    const items = await suggest("ㄱㄹ");

    // 이름 전체를 짚으면 통째로 진해져 어디가 걸렸는지 알 수 없다.
    expect(items.some((item: Suggestion) => sliced(item) === item.match.text)).toBe(false);
  });

  it("짚어 준 구간은 언제나 원문 안에 있다", async () => {
    for (const keyword of ["글리", "ㅍㄷㅇㅇ", "ㄱㄹ", "glycerin", "판"]) {
      for (const item of await suggest(keyword)) {
        expect(item.match.startIndex).toBeGreaterThanOrEqual(0);
        expect(item.match.endIndexExclusive).toBeLessThanOrEqual(item.match.text.length);
        expect(item.match.startIndex).toBeLessThan(item.match.endIndexExclusive);
      }
    }
  });
});
