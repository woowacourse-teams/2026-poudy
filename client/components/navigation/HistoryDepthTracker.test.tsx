/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HistoryDepthTracker } from "./HistoryDepthTracker";

import { hasInSiteHistory, markPop } from "@/lib/navigation/history-depth";

let pathname = "/products/1";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

beforeEach(() => {
  pathname = "/products/1";
  [1, 2, 3, 4, 5].forEach(() => markPop());
  Object.defineProperty(document, "referrer", { configurable: true, value: "" });
});

describe("HistoryDepthTracker", () => {
  it("들어온 첫 화면은 옮겨 온 것으로 세지 않는다", () => {
    render(
      <StrictMode>
        <HistoryDepthTracker />
      </StrictMode>,
    );

    expect(hasInSiteHistory()).toBe(false);
  });

  it("다른 화면으로 옮겨 가면 한 번만 센다", () => {
    const { rerender } = render(
      <StrictMode>
        <HistoryDepthTracker />
      </StrictMode>,
    );

    pathname = "/ingredients/1";
    rerender(
      <StrictMode>
        <HistoryDepthTracker />
      </StrictMode>,
    );

    expect(hasInSiteHistory()).toBe(true);

    markPop();

    expect(hasInSiteHistory()).toBe(false);
  });
});
