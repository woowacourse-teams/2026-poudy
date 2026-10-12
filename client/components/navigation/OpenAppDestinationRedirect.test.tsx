/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpenAppDestinationRedirect } from "./OpenAppDestinationRedirect";

import { APP_STORE_URL } from "@/lib/navigation/open-app";

const { track, flush } = vi.hoisted(() => ({ track: vi.fn(), flush: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track, flushAnalyticsBeforeNavigation: flush }));

const replace = vi.fn();
let url: string;
let ready: () => void;

beforeEach(() => {
  vi.clearAllMocks();
  url = "https://poudy.site/open-app?source=qr_scan";
  Object.defineProperty(navigator, "userAgent", { value: "Android Chrome", configurable: true });
  Object.defineProperty(window, "location", {
    value: {
      get href() {
        return url;
      },
      replace,
    },
    configurable: true,
  });
  const pending = new Promise<void>((resolve) => {
    ready = resolve;
  });
  flush.mockReturnValue(pending);
});

afterEach(() => {
  delete window.__POUDY_APP__;
  Reflect.deleteProperty(window, "ReactNativeWebView");
});

const finish = async () => {
  ready();
  await Promise.resolve();
};

describe("앱 설치 유입과 스토어 이동", () => {
  it("QR 스캔 도착을 기록하고 비콘 준비 뒤에 intent로 이동한다", async () => {
    render(<OpenAppDestinationRedirect />);
    expect(track).toHaveBeenCalledExactlyOnceWith("app_install_landed", { source: "qr_scan" }, { beacon: true });
    expect(replace).not.toHaveBeenCalled();
    await finish();
    expect(replace).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("intent://poudy.site/"));
    expect(decodeURIComponent(replace.mock.calls[0][0])).toContain("source=qr_scan&store=google_play");
  });

  it.each(["qr_scan", "qr_click", "install_banner"])(
    "%s 스토어 fallback은 스토어 이동만 한 번 기록한다",
    async (source) => {
      url = `https://poudy.site/open-app?source=${source}&store=google_play`;
      render(
        <StrictMode>
          <OpenAppDestinationRedirect />
        </StrictMode>,
      );
      expect(track).toHaveBeenCalledExactlyOnceWith(
        "app_store_redirected",
        { source, store: "google_play" },
        { beacon: true },
      );
      await finish();
      expect(replace).toHaveBeenCalledExactlyOnceWith(APP_STORE_URL);
    },
  );

  it("데스크톱 QR 클릭은 클릭 유입과 직접 스토어 이동을 각각 기록한다", async () => {
    url = "https://poudy.site/open-app?source=qr_click";
    Object.defineProperty(navigator, "userAgent", { value: "Macintosh", configurable: true });
    render(<OpenAppDestinationRedirect />);
    expect(track.mock.calls.map(([event]) => event)).toEqual(["app_install_landed", "app_store_redirected"]);
    await finish();
    expect(replace).toHaveBeenCalledExactlyOnceWith(APP_STORE_URL);
  });

  it("앱 웹뷰는 스토어 이벤트 없이 홈으로 보낸다", async () => {
    window.__POUDY_APP__ = {
      is_app: true,
      platform: "android",
      app_version: "1.0.0",
      os_version: "14",
      device_model: "Pixel",
    };
    url += "&store=google_play";
    render(<OpenAppDestinationRedirect />);
    await finish();
    expect(track).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledExactlyOnceWith("https://poudy.site/");
  });

  it("표시가 없는 기존 QR 주소를 스캔이라고 가정하지 않는다", async () => {
    url = "https://poudy.site/open-app?source=forged";
    render(<OpenAppDestinationRedirect />);
    expect(track).toHaveBeenCalledWith("app_install_landed", { source: "unknown" }, { beacon: true });
    await finish();
  });

  it("수동 스토어 링크를 눌러도 자동 이동과 중복 집계하지 않는다", async () => {
    url += "&store=google_play";
    render(<OpenAppDestinationRedirect />);
    fireEvent.click(screen.getByRole("link", { name: "Play 스토어에서 받기" }));
    await finish();
    expect(track).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledExactlyOnceWith(APP_STORE_URL);
  });

  it("이동 전 화면이 사라지면 뒤늦게 다른 화면을 덮어쓰지 않는다", async () => {
    const { unmount } = render(<OpenAppDestinationRedirect />);
    unmount();
    await finish();
    expect(replace).not.toHaveBeenCalled();
  });
});
