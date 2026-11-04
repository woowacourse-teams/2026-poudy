import { describe, expect, it } from "vitest";

import { STACKED_CHIP_COUNT, chipBlockClass } from "./chip-block";

describe("chipBlockClass", () => {
  it("칩이 기준 개수보다 적으면 행 절반을 기본 폭으로 두어 이름 옆에 놓일 수 있게 한다", () => {
    expect(chipBlockClass(STACKED_CHIP_COUNT - 1)).toContain("basis-1/2");
    expect(chipBlockClass(STACKED_CHIP_COUNT - 1)).toContain("grow");
  });

  it("칩이 기준 개수 이상이면 행 폭을 기본 폭으로 두어 늘 이름 아래로 내린다", () => {
    expect(chipBlockClass(STACKED_CHIP_COUNT)).toContain("basis-full");
    expect(chipBlockClass(STACKED_CHIP_COUNT + 4)).toContain("basis-full");
  });

  it("어느 쪽이든 최대 폭은 행 폭이다", () => {
    expect(chipBlockClass(1)).toContain("max-w-full");
    expect(chipBlockClass(STACKED_CHIP_COUNT)).toContain("max-w-full");
  });
});
