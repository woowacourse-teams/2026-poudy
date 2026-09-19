import { describe, expect, it } from "vitest";

import { shouldShowAppBanner } from "./app-banner";

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const context = (overrides: Partial<Parameters<typeof shouldShowAppBanner>[0]> = {}) =>
  shouldShowAppBanner({ userAgent: ANDROID_UA, isInAppWebView: false, dismissed: false, ...overrides });

describe("앱 설치 배너 노출 판단", () => {
  it("안드로이드 브라우저에서 보여 준다", () => {
    expect(context()).toBe(true);
  });

  /* 앱은 Play 스토어에만 있다. iOS 에서 띄워도 받을 곳이 없다. */
  it("iPhone 에서는 보여 주지 않는다", () => {
    expect(context({ userAgent: IPHONE_UA })).toBe(false);
  });

  it("데스크톱에서는 보여 주지 않는다", () => {
    expect(context({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" })).toBe(false);
  });

  /*
   * 앱 안에서 앱을 받으라고 권하는 꼴이 되고, 눌러서 스토어로 보내면 쓰던 화면에서 밀려난다.
   */
  it("앱 웹뷰 안에서는 보여 주지 않는다", () => {
    expect(context({ isInAppWebView: true })).toBe(false);
  });

  it("이미 닫았으면 보여 주지 않는다", () => {
    expect(context({ dismissed: true })).toBe(false);
  });

  /* 닫은 뒤에는 안드로이드라도 다시 올라오지 않아야 한다. */
  it("닫기는 다른 조건보다 우선한다", () => {
    expect(context({ dismissed: true, isInAppWebView: false })).toBe(false);
  });
});
