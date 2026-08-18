import { describe, expect, it } from "vitest";

import { dropletFills, formatPrice, formatVolumeWithUnitPrice, levelLabel, unitPrice } from "./product-display";

describe("formatPrice", () => {
  it("천 단위를 끊어 원을 붙인다", () => {
    expect(formatPrice(18000)).toBe("18,000원");
  });
});

describe("unitPrice", () => {
  it("가격을 용량으로 나눠 반올림한다", () => {
    expect(unitPrice(18000, { volumeValue: 200, volumeUnit: "ml" })).toBe(90);
    expect(unitPrice(23000, { volumeValue: 300, volumeUnit: "ml" })).toBe(77);
  });

  it("용량이 0 이면 계산하지 않는다", () => {
    expect(unitPrice(18000, { volumeValue: 0, volumeUnit: "ml" })).toBeUndefined();
  });
});

describe("formatVolumeWithUnitPrice", () => {
  it("디자인의 표기를 만든다", () => {
    expect(formatVolumeWithUnitPrice(18000, { volumeValue: 200, volumeUnit: "ml" })).toBe("200ml · ml당 90원");
  });

  it("용량을 알 수 없으면 단가를 빼고 보여준다", () => {
    expect(formatVolumeWithUnitPrice(18000, { volumeValue: 0, volumeUnit: "ml" })).toBe("0ml");
  });
});

describe("levelLabel", () => {
  it("0~3 을 이름으로 바꾼다", () => {
    expect([0, 1, 2, 3].map(levelLabel)).toEqual(["없음", "낮음", "보통", "높음"]);
  });

  it("범위를 벗어나면 없음으로 본다", () => {
    expect(levelLabel(9)).toBe("없음");
  });
});

describe("dropletFills", () => {
  it("단계만큼 채운다", () => {
    expect(dropletFills(0)).toEqual([false, false, false]);
    expect(dropletFills(2)).toEqual([true, true, false]);
    expect(dropletFills(3)).toEqual([true, true, true]);
  });
});
