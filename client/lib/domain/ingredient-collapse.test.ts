import { describe, expect, it } from "vitest";

import { collapsedView } from "./ingredient-collapse";

const cautionsAt = (length: number, ...indexes: number[]) =>
  Array.from({ length }, (_, index) => indexes.includes(index));

describe("collapsedView", () => {
  it("앞에서 정한 개수만 보이고 나머지 수를 센다", () => {
    const view = collapsedView(cautionsAt(8), 5);

    expect([...view.visible]).toEqual([0, 1, 2, 3, 4]);
    expect(view.gapsBefore.size).toBe(0);
    expect(view.hiddenCount).toBe(3);
  });

  it("접힌 쪽의 주의 성분도 보이고, 그 앞에 감춘 성분의 순서를 알린다", () => {
    const view = collapsedView(cautionsAt(16, 13), 5);

    expect([...view.visible]).toEqual([0, 1, 2, 3, 4, 13]);
    expect(view.gapsBefore.get(13)).toEqual({ from: 6, to: 13 });
    expect(view.hiddenCount).toBe(10);
  });

  it("앞쪽 성분 바로 뒤의 주의 성분은 사이에 감춘 것이 없어 알리지 않는다", () => {
    const view = collapsedView(cautionsAt(8, 5), 5);

    expect(view.gapsBefore.size).toBe(0);
    expect(view.hiddenCount).toBe(2);
  });
});
