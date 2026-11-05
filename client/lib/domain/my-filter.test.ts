import { describe, expect, it } from "vitest";

import { addedMessage, removedMessage } from "./my-filter";

describe("나만의 필터 토스트 문구", () => {
  it("짧은 성분명은 그대로 쓴다", () => {
    expect(removedMessage("향료")).toBe("향료를 나만의 필터에서 뺐어요");
    expect(addedMessage("판테놀")).toBe("판테놀을 나만의 필터에 넣었어요");
  });

  it("긴 성분명은 줄이고 조사는 원래 이름의 받침을 따른다(W06 예외 ④)", () => {
    const name = "비스-베헤닐/아이소스테아릴/피토스테릴다이머다이리놀레일다이머다이리놀레이트";
    expect(removedMessage(name)).toBe("비스-베헤닐/…를 나만의 필터에서 뺐어요");
    expect(addedMessage(name)).toBe("비스-베헤닐/…를 나만의 필터에 넣었어요");
  });
});
