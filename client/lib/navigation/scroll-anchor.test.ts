/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANCHOR_ATTRIBUTE, applyScrollPosition, readScrollPosition } from "@/lib/navigation/scroll-anchor";

const CARD_HEIGHT = 104;

/** 문서 기준 위치가 정해진 카드를 만든다. jsdom 은 배치를 하지 않아 직접 알려 준다. */
const card = (id: number, documentTop: number): HTMLElement => {
  const element = document.createElement("li");
  element.setAttribute(ANCHOR_ATTRIBUTE, String(id));
  element.getBoundingClientRect = () => ({ top: documentTop - window.scrollY, height: CARD_HEIGHT }) as DOMRect;
  document.body.append(element);
  return element;
};

const scrollTo = vi.fn();

beforeEach(() => {
  document.body.innerHTML = "";
  scrollTo.mockClear();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true });
  document.elementFromPoint = () => null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const scrolledTo = (scrollY: number) =>
  Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });

describe("보던 자리", () => {
  it("화면 맨 위에 걸린 항목과 지나친 만큼을 함께 담는다", () => {
    const top = card(7, 1240);
    scrolledTo(1292);
    document.elementFromPoint = () => top;

    expect(readScrollPosition()).toEqual({ scrollY: 1292, anchor: { id: 7, offset: 52 } });
  });

  it("맨 위에 항목이 없으면 픽셀값만 담는다", () => {
    scrolledTo(40);

    expect(readScrollPosition()).toEqual({ scrollY: 40, anchor: undefined });
  });

  it("목록이 그대로면 떠날 때와 같은 자리로 되돌린다", () => {
    card(7, 1240);

    applyScrollPosition({ scrollY: 1292, anchor: { id: 7, offset: 52 } });

    expect(scrollTo).toHaveBeenCalledWith(0, 1292);
  });

  it("항목이 밀렸으면 픽셀이 아니라 그 항목을 따라간다", () => {
    // 위쪽 제품이 빠져 카드 한 장만큼 올라왔다.
    card(7, 1240 - CARD_HEIGHT);

    applyScrollPosition({ scrollY: 1292, anchor: { id: 7, offset: 52 } });

    expect(scrollTo).toHaveBeenCalledWith(0, 1292 - CARD_HEIGHT);
  });

  it("항목이 사라졌으면 픽셀값으로 되돌린다", () => {
    applyScrollPosition({ scrollY: 1292, anchor: { id: 7, offset: 52 } });

    expect(scrollTo).toHaveBeenCalledWith(0, 1292);
  });

  it("지나친 만큼이 항목 높이를 넘으면 항목 안으로 자른다", () => {
    card(7, 1240);

    applyScrollPosition({ scrollY: 9999, anchor: { id: 7, offset: 500 } });

    expect(scrollTo).toHaveBeenCalledWith(0, 1240 + CARD_HEIGHT);
  });

  it("맨 위였으면 스크롤을 건드리지 않는다", () => {
    applyScrollPosition({ scrollY: 0 });

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
