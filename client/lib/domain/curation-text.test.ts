import { describe, expect, it } from "vitest";

import { curationOneLine } from "./curation-text";

describe("curationOneLine", () => {
  it("캐러셀용 줄바꿈을 공백 하나로 합친다", () => {
    expect(curationOneLine("가을이 오면,\n보습도 한 단계 더")).toBe("가을이 오면, 보습도 한 단계 더");
  });

  it("앞뒤 공백과 겹친 공백을 걷어 낸다", () => {
    expect(curationOneLine("  왜 발라도 \n\n 다시 건조할까?  ")).toBe("왜 발라도 다시 건조할까?");
  });
});
