/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginUpdateNotice } from "./LoginUpdateNotice";

import { markPop, markPush } from "@/lib/navigation/history-depth";

const APP_INFO = {
  is_app: true,
  platform: "android",
  app_version: "0.1.4",
  os_version: "14",
  device_model: "SM-S911N",
};

const { moved, router } = vi.hoisted(() => ({
  moved: { to: "" },
  router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/navigation/browser-location", () => ({
  currentUrl: () => new URL("https://poudy.site/login"),
  assignLocation: (url: string) => {
    moved.to = url;
  },
}));

beforeEach(() => {
  moved.to = "";
  vi.clearAllMocks();
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
    // 로그인 안내 화면(S349~S352)과 같은 틀이다. 상단 내비 제목은 p 로 내리고 안내 제목을 제목으로 둔다(S344).
    expect(screen.getByText("로그인", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "로그인하려면 앱을 업데이트해 주세요" })).toBeInTheDocument();
    expect(screen.getByText("지금 쓰는 앱에서는 로그인할 수 없어요.")).toBeInTheDocument();
    expect(screen.getByText("업데이트하면 바로 로그인할 수 있어요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인 없이 둘러보기" }).getAttribute("href")).toBe("/");
  });

  /* 안내만 닫으면 이 앱에서 끝낼 수 없는 로그인 버튼이 드러나므로, ‹ 는 로그인 화면을 떠난다. */
  it("사이트 안에서 왔으면 상단 ‹ 로 로그인하러 오기 전 화면으로 돌아간다", async () => {
    window.__POUDY_APP__ = APP_INFO;
    markPush();

    try {
      render(<LoginUpdateNotice />);
      await userEvent.click(screen.getByRole("button", { name: "이전 화면" }));
    } finally {
      markPop();
    }

    expect(router.back).toHaveBeenCalled();
  });

  it("밖에서 바로 들어왔으면 상단 ‹ 는 홈으로 가는 링크다", () => {
    window.__POUDY_APP__ = APP_INFO;

    render(<LoginUpdateNotice />);

    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });

  it("앱 내 업데이트를 지원하는 앱에는 업데이트를 맡긴다", async () => {
    const postMessage = vi.fn();
    window.__POUDY_APP__ = APP_INFO;
    Object.defineProperty(window, "ReactNativeWebView", { value: { postMessage }, configurable: true });
    Object.defineProperty(window, "__POUDY_APP_UPDATE__", { value: true, configurable: true });

    render(<LoginUpdateNotice />);
    await userEvent.click(screen.getByRole("button", { name: "업데이트" }));

    expect(postMessage).toHaveBeenCalledWith("poudy:app-update");
    expect(moved.to).toBe("");
  });

  /* 예전 앱도 서비스 밖 주소는 기기에 넘기므로 Play 스토어 앱이 열린다. */
  it("예전 앱은 Play 스토어로 보낸다", async () => {
    const postMessage = vi.fn();
    window.__POUDY_APP__ = APP_INFO;
    Object.defineProperty(window, "ReactNativeWebView", { value: { postMessage }, configurable: true });

    render(<LoginUpdateNotice />);
    await userEvent.click(screen.getByRole("button", { name: "업데이트" }));

    expect(postMessage).not.toHaveBeenCalled();
    expect(moved.to).toBe("https://play.google.com/store/apps/details?id=com.poudy.app");
  });
});
