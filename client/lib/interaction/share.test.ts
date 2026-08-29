/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sharePage } from "./share";

const URL_TO_SHARE = "https://poudy.site/products/1";

const APP_INFO = {
  is_app: true,
  platform: "android",
  app_version: "0.1.2",
  os_version: "16",
  device_model: "SM-S926N",
} as const;

const setWebView = (postMessage: ((message: string) => void) | undefined) => {
  Object.defineProperty(window, "ReactNativeWebView", {
    configurable: true,
    value: postMessage ? { postMessage } : undefined,
  });
};

const setClipboard = (writeText: (value: string) => Promise<void>) => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
};

beforeEach(() => {
  setWebView(undefined);
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
});

afterEach(() => {
  delete window.__POUDY_APP__;
});

describe("sharePage", () => {
  it("공유를 받는 앱에서는 앱에 넘긴다", async () => {
    const postMessage = vi.fn();
    setWebView(postMessage);
    window.__POUDY_APP__ = APP_INFO;

    await expect(sharePage(URL_TO_SHARE)).resolves.toBe("shared");
    expect(postMessage).toHaveBeenCalledWith(`poudy:share:${URL_TO_SHARE}`);
  });

  it("공유를 모르는 옛 앱에는 보내지 않고 주소를 복사한다", async () => {
    const postMessage = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setWebView(postMessage);
    setClipboard(writeText);
    window.__POUDY_APP__ = { ...APP_INFO, app_version: "0.1.1" };

    await expect(sharePage(URL_TO_SHARE)).resolves.toBe("copied");
    expect(postMessage).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(URL_TO_SHARE);
  });

  it("공유를 지원하는 브라우저에서는 공유 시트를 연다", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    await expect(sharePage(URL_TO_SHARE)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ url: URL_TO_SHARE });
  });

  it("공유 시트를 닫아도 실패로 보지 않는다", async () => {
    const share = vi.fn().mockRejectedValue(new Error("AbortError"));
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    await expect(sharePage(URL_TO_SHARE)).resolves.toBe("shared");
  });

  it("둘 다 없으면 주소를 복사한다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    await expect(sharePage(URL_TO_SHARE)).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith(URL_TO_SHARE);
  });
});
