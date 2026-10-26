/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useShelfEntry } from "./useShelfEntry";

import { clearShelfJourney } from "@/lib/analytics/shelf-journey";
import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
beforeEach(() => {
  vi.mocked(track).mockClear();
  clearShelfJourney();
});

describe("공유 내비게이션의 선반 진입점", () => {
  it("같은 화면의 재렌더링은 유지하고 다른 화면이나 재방문에는 새 노출 ID를 만든다", () => {
    const view = renderHook(
      ({ path }) =>
        useShelfEntry({ source: "bottom_navigation", placement: "tab", authState: "signed_out", viewKey: path }),
      { initialProps: { path: "/" } },
    );
    act(() => view.result.current.select());
    view.rerender({ path: "/" });
    act(() => view.result.current.select());
    view.rerender({ path: "/search/products" });
    act(() => view.result.current.select());
    view.rerender({ path: "/" });
    act(() => view.result.current.select());
    const ids = vi
      .mocked(track)
      .mock.calls.map(([, properties]) => ("entry_view_id" in properties ? properties.entry_view_id : undefined));
    expect(ids[0]).toBe(ids[1]);
    expect(new Set([ids[0], ids[2], ids[3]]).size).toBe(3);
  });
});
