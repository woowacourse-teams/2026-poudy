import { describe, expect, it } from "vitest";

import { keepWords, timestamp } from "./youtube-format";

const J = "⁠";

describe("keepWords", () => {
  it("낱말 안의 문장 부호 앞뒤를 잇고, 띄어쓰기와 글자 사이는 그대로 둔다", () => {
    expect(keepWords("여름 건성 토너, 세럼·크림 병행")).toBe(`여름 건성 토너${J}, 세럼${J}·${J}크림 병행`);
    expect(keepWords("갈아탔어요...여름→가을")).toBe(`갈아탔어요${J}.${J}.${J}.${J}여름${J}→${J}가을`);
    expect(keepWords("피부텐텐 · 피부가 예뻐지는 10분")).toBe("피부텐텐 · 피부가 예뻐지는 10분");
  });

  it("이미 이은 글자에 다시 써도 결합자를 겹쳐 넣지 않는다", () => {
    expect(keepWords(keepWords("세럼·크림"))).toBe(keepWords("세럼·크림"));
  });
});

describe("timestamp", () => {
  it("1시간이 넘으면 시:분:초로 적는다", () => {
    expect(timestamp(64100)).toBe("1:04");
    expect(timestamp(3730000)).toBe("1:02:10");
  });
});
