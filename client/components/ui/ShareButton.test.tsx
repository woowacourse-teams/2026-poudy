/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShareButton } from "./ShareButton";

const APP_INFO = {
  is_app: true,
  platform: "android",
  app_version: "0.1.1",
  os_version: "16",
  device_model: "SM-S926N",
} as const;

const writeText = vi.fn().mockResolvedValue(undefined);

const setWebView = (postMessage: ((message: string) => void) | undefined) => {
  Object.defineProperty(window, "ReactNativeWebView", {
    configurable: true,
    value: postMessage ? { postMessage } : undefined,
  });
};

beforeEach(() => {
  writeText.mockClear();
  setWebView(undefined);
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
});

afterEach(() => {
  delete window.__POUDY_APP__;
});

describe("ShareButton 복사 안내", () => {
  it("브라우저에서 주소를 복사하면 안내를 띄운다", async () => {
    render(<ShareButton />);

    await userEvent.click(screen.getByRole("button", { name: "공유하기" }));

    expect(await screen.findByRole("status")).toHaveTextContent("주소를 복사했어요");
  });

  it("옛 앱에서 주소를 복사하면 시스템 안내만 남긴다", async () => {
    setWebView(vi.fn());
    window.__POUDY_APP__ = APP_INFO;
    render(<ShareButton />);

    await userEvent.click(screen.getByRole("button", { name: "공유하기" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
