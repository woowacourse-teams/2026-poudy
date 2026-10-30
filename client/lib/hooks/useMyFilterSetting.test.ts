/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track }));

import { myFilterRequested, useMyFilterSetting } from "./useMyFilterSetting";

import { readMyFilterOn } from "@/lib/storage/my-filter-setting";

afterEach(() => {
  document.cookie = "poudy-my-filter=; path=/; max-age=0";
});

describe("useMyFilterSetting", () => {
  it("서버가 넘긴 값으로 시작하고, 바꾸면 쿠키에 남기고 분석 이벤트를 보낸다", () => {
    const { result } = renderHook(() =>
      useMyFilterSetting(true, { surface: "product_list", status: { status: "ready", count: 3 } }),
    );
    expect(result.current.on).toBe(true);

    act(() => result.current.change(false));
    expect(result.current.on).toBe(false);
    expect(readMyFilterOn()).toBe(false);
    expect(track).toHaveBeenLastCalledWith("my_filter_toggled", {
      action: "off",
      surface: "product_list",
      ingredient_count: 3,
    });

    act(() => result.current.change(true));
    expect(track).toHaveBeenLastCalledWith("my_filter_toggled", {
      action: "on",
      surface: "product_list",
      ingredient_count: 3,
    });
  });
});

describe("myFilterRequested", () => {
  const READY = { status: "ready", count: 3 } as const;

  it("설정이 켬이고 필터에 성분이 있으면 적용한다. 비어 있으면 서버 렌더와 같이 적용하지 않는다", () => {
    expect(myFilterRequested({ on: true, status: READY, serverApplied: false })).toBe(true);
    expect(myFilterRequested({ on: true, status: { status: "ready", count: 0 }, serverApplied: true })).toBe(false);
  });

  it("회원 상태를 읽기 전에는 서버 컴포넌트가 정한 값을 쓴다", () => {
    expect(myFilterRequested({ on: true, status: { status: "loading" }, serverApplied: true })).toBe(true);
    expect(myFilterRequested({ on: true, status: { status: "loading" }, serverApplied: false })).toBe(false);
  });

  it("꺼 두었거나, 로그인 전이거나, 세션이 끝났으면 적용하지 않는다", () => {
    expect(myFilterRequested({ on: false, status: READY, serverApplied: true })).toBe(false);
    expect(myFilterRequested({ on: true, status: { status: "signedOut" }, serverApplied: true })).toBe(false);
    expect(myFilterRequested({ on: true, status: { status: "unavailable" }, serverApplied: true })).toBe(false);
    expect(myFilterRequested({ on: true, status: READY, serverApplied: true, sessionLost: true })).toBe(false);
  });
});
