/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useScrollLock } from "./useScrollLock";

const overflow = () => document.documentElement.style.overflow;

afterEach(() => {
  document.documentElement.style.overflow = "";
});

describe("useScrollLock", () => {
  it("잠그는 동안 화면 스크롤을 막고, 풀면 원래 값으로 돌린다", () => {
    const sheet = renderHook(({ locked }) => useScrollLock(locked), { initialProps: { locked: true } });
    expect(overflow()).toBe("hidden");

    sheet.rerender({ locked: false });
    expect(overflow()).toBe("");
  });

  it("두 시트가 겹쳐 열렸다가 먼저 연 시트가 먼저 닫혀도 모두 닫히면 풀린다", () => {
    const menu = renderHook(() => useScrollLock(true));
    const rating = renderHook(() => useScrollLock(true));

    menu.unmount();
    expect(overflow()).toBe("hidden");

    rating.unmount();
    expect(overflow()).toBe("");
  });
});
