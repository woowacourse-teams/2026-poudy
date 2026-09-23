/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppInstallBanner } from "./AppInstallBanner";

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
};

const CURRENT_URL = "https://poudy.site/products/123?sort=popular";

/*
 * jsdom 은 주소를 실제로 옮기지 않는다. 읽을 때는 지금 보던 주소를 내주고, 넣을 때는
 * 어디로 보내려 했는지만 받아 둔다.
 */
let assigned = "";

beforeEach(() => {
  assigned = "";
  setUserAgent(ANDROID_UA);
  window.sessionStorage.clear();
  Object.defineProperty(window, "location", {
    value: {
      get href() {
        return CURRENT_URL;
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
  Reflect.deleteProperty(window, "ReactNativeWebView");
  vi.restoreAllMocks();
  /* 환경을 바꾼 테스트가 다음 테스트까지 끌고 가지 않도록 되돌린다. */
  vi.unstubAllEnvs();
});

const banner = () => screen.queryByRole("button", { name: /이 화면을 앱에서 열기/ });

describe("앱 설치 배너", () => {
  it("안드로이드 브라우저에서 보여 준다", () => {
    render(<AppInstallBanner />);

    expect(banner()).toBeInTheDocument();
  });

  it("iPhone 에서는 보여 주지 않는다", () => {
    setUserAgent(IPHONE_UA);

    render(<AppInstallBanner />);

    expect(banner()).not.toBeInTheDocument();
  });

  /* 앱 안에서 앱을 받으라고 권하는 꼴이 된다. */
  it("앱 웹뷰 안에서는 보여 주지 않는다", () => {
    Object.defineProperty(window, "ReactNativeWebView", { value: { postMessage: () => {} }, configurable: true });

    render(<AppInstallBanner />);

    expect(banner()).not.toBeInTheDocument();
  });

  it("보던 화면의 경로를 담아 앱을 연다", async () => {
    render(<AppInstallBanner />);

    await userEvent.click(banner()!);

    /* 경로와 조건이 모두 담겨야 앱이 같은 화면을 연다. */
    expect(assigned).toContain("intent://poudy.site/products/123?sort=popular");
    expect(assigned).toContain("package=com.poudy.app");
  });

  /*
   * 바로가기는 앱으로 보내는 길이지 거절이 아니다. 여기서 닫기를 기록하면 앱을 받으러
   * 갔다가 돌아온 사람에게 배너가 사라져, 스토어에서 마음을 바꾼 사람이 다시 누를 자리를
   * 잃는다.
   */
  it("바로가기를 눌러도 닫기로 기억하지 않는다", async () => {
    render(<AppInstallBanner />);

    await userEvent.click(banner()!);

    expect(window.sessionStorage.getItem("poudy.app-banner.dismissed")).toBeNull();
  });

  /* 앱이 없는 사람은 받을 수 있는 곳으로 보낸다. */
  it("앱이 없으면 Play 스토어로 되돌아가게 한다", async () => {
    render(<AppInstallBanner />);

    await userEvent.click(banner()!);

    expect(decodeURIComponent(assigned)).toContain("https://play.google.com/store/apps/details?id=com.poudy.app");
  });

  it("닫으면 사라지고 이 방문 동안 기억한다", async () => {
    const { unmount } = render(<AppInstallBanner />);

    await userEvent.click(screen.getByRole("button", { name: "앱 설치 안내 닫기" }));

    expect(banner()).not.toBeInTheDocument();

    /* 다시 들어와도 올라오지 않아야 한다. */
    unmount();
    render(<AppInstallBanner />);

    expect(banner()).not.toBeInTheDocument();
  });

  /*
   * 개발 중에는 남은 기록을 읽지 않아 손볼 때마다 배너가 되살아난다.
   * 그 편의가 운영까지 새면 한 번 닫은 사람에게 배너가 계속 따라붙는다.
   */
  it("운영에서는 앞선 방문의 닫기 기록을 지킨다", () => {
    vi.stubEnv("NODE_ENV", "production");
    window.sessionStorage.setItem("poudy.app-banner.dismissed", "true");

    render(<AppInstallBanner />);

    expect(banner()).not.toBeInTheDocument();
  });

  it("개발에서는 닫기 기록이 남아 있어도 다시 보여 준다", () => {
    vi.stubEnv("NODE_ENV", "development");
    window.sessionStorage.setItem("poudy.app-banner.dismissed", "true");

    render(<AppInstallBanner />);

    expect(banner()).toBeInTheDocument();
  });
});
