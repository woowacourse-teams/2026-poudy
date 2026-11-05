/**
 * localStorage 를 쓰므로 브라우저 환경이 필요하다.
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  addComparisonItem,
  clearComparisonParts,
  clearComparisonTray,
  COMPARISON_MAX,
  getComparisonTraySnapshot,
  refreshComparisonTray,
  removeComparisonItem,
  selectComparisonPart,
  setComparisonCollapsed,
  subscribeComparisonTray,
} from "./comparison-tray";

const item = (productId: number, partId?: number) => ({
  productId,
  name: `제품 ${productId}`,
  brandName: "브랜드",
  imageUrl: "",
  ...(partId === undefined ? {} : { partId }),
});

const ids = () => getComparisonTraySnapshot().items.map(({ productId }) => productId);

beforeEach(() => {
  window.localStorage.clear();
  refreshComparisonTray();
});

describe("비교함", () => {
  it("담은 순서를 지키고 같은 제품은 한 번만 담는다", () => {
    addComparisonItem(item(2));
    addComparisonItem(item(1));
    expect(addComparisonItem(item(2))).toBe("added");
    expect(ids()).toEqual([2, 1]);
  });

  it(`${COMPARISON_MAX}개가 차면 담지 않고 알린다. 이미 담은 제품은 찼다고 하지 않는다`, () => {
    [1, 2, 3].forEach((id) => addComparisonItem(item(id)));
    expect(addComparisonItem(item(4))).toBe("full");
    expect(addComparisonItem(item(1))).toBe("added");
    expect(ids()).toEqual([1, 2, 3]);
  });

  it("다시 읽어도 담은 제품과 접힘 상태가 남는다", () => {
    addComparisonItem(item(1, 11));
    setComparisonCollapsed(true);
    refreshComparisonTray();
    expect(getComparisonTraySnapshot()).toEqual({ items: [item(1, 11)], collapsed: true });
  });

  it("접어도 담은 제품은 그대로이고, 모두 빼면 접힘도 풀린다", () => {
    addComparisonItem(item(1));
    addComparisonItem(item(2));
    setComparisonCollapsed(true);
    removeComparisonItem(1);
    expect(getComparisonTraySnapshot()).toEqual({ items: [item(2)], collapsed: true });
    removeComparisonItem(2);
    expect(getComparisonTraySnapshot()).toEqual({ items: [], collapsed: false });
  });

  it("구성품을 제품별로 고르고, 한꺼번에 첫 구성품으로 되돌린다", () => {
    addComparisonItem(item(1));
    addComparisonItem(item(2, 21));
    selectComparisonPart(1, 12);
    expect(getComparisonTraySnapshot().items).toEqual([item(1, 12), item(2, 21)]);
    clearComparisonParts();
    expect(getComparisonTraySnapshot().items).toEqual([item(1), item(2)]);
  });

  it("저장된 값의 모양이 다르거나 3개를 넘으면 버린다", () => {
    const saved = (value: unknown) =>
      window.localStorage.setItem("poudy.comparison-tray", JSON.stringify({ version: 1, value }));

    saved({ items: [{ productId: "1" }], collapsed: false });
    refreshComparisonTray();
    expect(ids()).toEqual([]);

    saved({ items: [1, 2, 3, 4].map((id) => item(id)), collapsed: false });
    refreshComparisonTray();
    expect(ids()).toEqual([]);
  });

  it("바뀌면 구독자에게 알리고, 비우면 저장소에서도 지운다", () => {
    let calls = 0;
    const unsubscribe = subscribeComparisonTray(() => {
      calls += 1;
    });
    addComparisonItem(item(1));
    clearComparisonTray();
    unsubscribe();
    addComparisonItem(item(2));
    expect(calls).toBe(2);
    clearComparisonTray();
    expect(window.localStorage.getItem("poudy.comparison-tray")).toBeNull();
  });
});
