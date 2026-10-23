/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestSelectionHaptic } from "./haptic";

describe("requestSelectionHaptic", () => {
  beforeEach(() => {
    Object.defineProperty(window, "ReactNativeWebView", {
      configurable: true,
      value: undefined,
    });
  });

  it("네이티브 WebView에 선택 햅틱을 요청한다", () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, "ReactNativeWebView", {
      configurable: true,
      value: { postMessage },
    });

    requestSelectionHaptic();

    expect(postMessage).toHaveBeenCalledWith("poudy:haptic:selection");
  });

  it("앱 WebView 에서는 웹 진동을 쓰지 않는다", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });
    Object.defineProperty(window, "ReactNativeWebView", { configurable: true, value: { postMessage: vi.fn() } });

    requestSelectionHaptic();

    expect(vibrate).not.toHaveBeenCalled();
  });

  it("일반 브라우저에서는 진동을 지원하면 짧게 떤다", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });

    requestSelectionHaptic();

    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it("진동을 지원하지 않는 브라우저에서는 아무것도 하지 않는다", () => {
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined });

    expect(() => requestSelectionHaptic()).not.toThrow();
  });
});
