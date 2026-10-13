/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginUpdateNotice } from "./LoginUpdateNotice";

const APP_INFO = {
  is_app: true,
  platform: "android",
  app_version: "0.1.4",
  os_version: "14",
  device_model: "SM-S911N",
};

let assigned = "";

beforeEach(() => {
  assigned = "";
  Object.defineProperty(window, "location", {
    value: {
      get href() {
        return "https://poudy.site/login";
      },
      set href(value: string) {
        assigned = value;
      },
    },
    configurable: true,
  });
});

afterEach(() => {
  delete window.__POUDY_APP__;
  Reflect.deleteProperty(window, "__POUDY_APP_UPDATE__");
  Reflect.deleteProperty(window, "ReactNativeWebView");
});

const notice = () => screen.queryByRole("alertdialog", { name: "로그인하려면 앱을 업데이트해 주세요" });

describe("로그인 업데이트 안내", () => {
  it("웹 브라우저에서는 보이지 않는다", () => {
    render(<LoginUpdateNotice />);

    expect(notice()).toBeNull();
  });

  it("로그인을 지원하는 앱에서는 보이지 않는다", () => {
    window.__POUDY_APP__ = { ...APP_INFO, app_version: "0.1.5" };

    render(<LoginUpdateNotice />);

    expect(notice()).toBeNull();
  });

  it("로그인을 지원하지 않는 앱은 로그인 화면을 덮는다", () => {
    window.__POUDY_APP__ = APP_INFO;

    render(<LoginUpdateNotice />);

    expect(notice()).not.toBeNull();
    expect(screen.getByRole("link", { name: "로그인 없이 둘러보기" }).getAttribute("href")).toBe("/");
  });

  it("앱 내 업데이트를 지원하는 앱에는 업데이트를 맡긴다", async () => {
    const postMessage = vi.fn();
    window.__POUDY_APP__ = APP_INFO;
    Object.defineProperty(window, "ReactNativeWebView", { value: { postMessage }, configurable: true });
    Object.defineProperty(window, "__POUDY_APP_UPDATE__", { value: true, configurable: true });

    render(<LoginUpdateNotice />);
    await userEvent.click(screen.getByRole("button", { name: "업데이트" }));

    expect(postMessage).toHaveBeenCalledWith("poudy:app-update");
    expect(assigned).toBe("");
  });

  /* 예전 앱도 서비스 밖 주소는 기기에 넘기므로 Play 스토어 앱이 열린다. */
  it("예전 앱은 Play 스토어로 보낸다", async () => {
    const postMessage = vi.fn();
    window.__POUDY_APP__ = APP_INFO;
    Object.defineProperty(window, "ReactNativeWebView", { value: { postMessage }, configurable: true });

    render(<LoginUpdateNotice />);
    await userEvent.click(screen.getByRole("button", { name: "업데이트" }));

    expect(postMessage).not.toHaveBeenCalled();
    expect(assigned).toBe("https://play.google.com/store/apps/details?id=com.poudy.app");
  });
});
