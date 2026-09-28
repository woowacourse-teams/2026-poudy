import { describe, expect, it } from "vitest";

import {
  addShareMarker,
  consumeShareMarker,
  APP_STORE_URL,
  buildAndroidIntentUrl,
  buildInstallIntentUrl,
  buildKakaoExternalUrl,
  consumeFallbackMarker,
  detectAndroidMobileBrowser,
  planAppOpen,
} from "./open-app";

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 16; SM-S926N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const WEB_URL = "https://poudy.site/products/42?from=%EC%B9%B4%EC%B9%B4%EC%98%A4#ingredients";
const FALLBACK_URL =
  "https://poudy.site/products/42?from=%EC%B9%B4%EC%B9%B4%EC%98%A4&_poudy_app_fallback=1#ingredients";

describe("detectAndroidMobileBrowser", () => {
  it.each([
    ["카카오톡", `${ANDROID_CHROME} KAKAOTALK 11.0.0`, "kakao"],
    ["인스타그램", `${ANDROID_CHROME} Instagram 395.0.0.0`, "other"],
    ["페이스북", `${ANDROID_CHROME} [FBAN/FB4A;FBAV/530.0.0.0]`, "other"],
    ["스레드", `${ANDROID_CHROME} [FBAN/Barcelona;FBAV/395.0.0.0]`, "other"],
    ["네이버", `${ANDROID_CHROME} NAVER(inapp; search; 2000; 12.15.1)`, "other"],
    ["밴드", `${ANDROID_CHROME} BAND/16.2.0`, "other"],
    ["라인", `${ANDROID_CHROME} Line/15.10.1`, "other"],
    ["Chrome", ANDROID_CHROME, "other"],
  ])("Android %s을 판별한다", (_, userAgent, expected) => {
    expect(detectAndroidMobileBrowser(userAgent)).toBe(expected);
  });

  it("데스크톱과 아직 지원하지 않는 iOS에는 앱 열기 경로를 만들지 않는다", () => {
    expect(
      detectAndroidMobileBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
      ),
    ).toBeNull();
    expect(
      detectAndroidMobileBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Instagram 395.0.0.0",
      ),
    ).toBeNull();
  });
});

describe("앱 자동 열기 주소", () => {
  it("카카오톡에서는 fallback 표시를 붙인 현재 화면을 OS 에 넘긴다", () => {
    expect(buildKakaoExternalUrl(WEB_URL)).toBe(`kakaotalk://web/openExternal?url=${encodeURIComponent(FALLBACK_URL)}`);
  });

  it("다른 Android 브라우저에서는 앱과 1회성 웹 fallback을 담은 intent 주소를 만든다", () => {
    expect(buildAndroidIntentUrl(WEB_URL)).toBe(
      `intent://poudy.site/products/42?from=%EC%B9%B4%EC%B9%B4%EC%98%A4#Intent;scheme=https;package=com.poudy.app;S.browser_fallback_url=${encodeURIComponent(FALLBACK_URL)};end`,
    );
  });

  it("웹 fallback 표시는 다른 검색 조건과 fragment를 보존하며 지운다", () => {
    expect(consumeFallbackMarker(FALLBACK_URL)).toBe(WEB_URL);
    expect(consumeFallbackMarker(WEB_URL)).toBeNull();
  });
});

describe("planAppOpen", () => {
  it("share=true인 Android 방문에서만 앱 열기를 계획한다", () => {
    expect(planAppOpen(addShareMarker(WEB_URL), ANDROID_CHROME, false)).toEqual({
      type: "open-app",
      appUrl: buildAndroidIntentUrl(WEB_URL),
      webUrl: WEB_URL,
    });
  });

  it("fallback으로 돌아온 웹에서는 표시만 지우고 앱을 다시 열지 않는다", () => {
    expect(planAppOpen(FALLBACK_URL, ANDROID_CHROME, false)).toEqual({
      type: "clean-url",
      webUrl: WEB_URL,
    });
  });

  it("Poudy 앱 WebView와 지원하지 않는 환경에서는 아무것도 하지 않는다", () => {
    expect(planAppOpen(WEB_URL, ANDROID_CHROME, true)).toEqual({ type: "none" });
    expect(planAppOpen(WEB_URL, "desktop", false)).toEqual({ type: "none" });
  });
});

describe("공유 표시", () => {
  it("다른 검색 조건과 fragment를 보존하고 중복 없이 표시를 붙이고 소비한다", () => {
    const markedUrl = addShareMarker(WEB_URL);
    expect(new URL(markedUrl).searchParams.get("share")).toBe("true");
    expect(addShareMarker(markedUrl)).toBe(markedUrl);
    expect(consumeShareMarker(markedUrl)).toBe(WEB_URL);
    expect(consumeShareMarker(WEB_URL)).toBeNull();
  });

  it.each(["", "?share=false", "?share=1", "?share=True", "?share="])(
    "정확한 share=true가 없으면 Android에서도 앱을 열지 않는다: %s",
    (query) => {
      expect(planAppOpen(`https://poudy.site/products/42${query}`, ANDROID_CHROME, false)).toEqual({ type: "none" });
    },
  );

  it.each([
    [ANDROID_CHROME, true],
    ["desktop", false],
    ["iPhone", false],
  ] as const)("앱 내부와 지원하지 않는 환경에서는 공유 표시만 지운다: %s", (userAgent, isApp) => {
    expect(planAppOpen(addShareMarker(WEB_URL), userAgent, isApp)).toEqual({ type: "clean-url", webUrl: WEB_URL });
  });

  it("fallback과 공유 표시가 함께 있으면 모두 지우고 앱을 다시 열지 않는다", () => {
    expect(planAppOpen(addShareMarker(FALLBACK_URL), ANDROID_CHROME, false)).toEqual({
      type: "clean-url",
      webUrl: WEB_URL,
    });
  });

  it("카카오톡 공유 방문은 표시를 지운 주소로 외부 열기를 계획한다", () => {
    expect(planAppOpen(addShareMarker(WEB_URL), `${ANDROID_CHROME} KAKAOTALK`, false)).toEqual({
      type: "open-app",
      appUrl: buildKakaoExternalUrl(WEB_URL),
      webUrl: WEB_URL,
    });
  });
});

describe("설치 배너가 여는 주소", () => {
  const HTTPS_URL = "https://poudy.site/products/123?sort=popular";

  it("보던 화면의 경로와 조건을 그대로 담는다", () => {
    expect(buildInstallIntentUrl(HTTPS_URL)).toContain("intent://poudy.site/products/123?sort=popular");
  });

  /* 배너는 설치를 권하는 자리라 앱이 없으면 받을 수 있는 곳으로 보낸다. */
  it("앱이 없으면 Play 스토어로 되돌아가게 한다", () => {
    expect(decodeURIComponent(buildInstallIntentUrl(HTTPS_URL))).toContain(APP_STORE_URL);
  });

  /*
   * intent 는 `scheme=https` 로 앱을 찾으므로 http 인 localhost 에서는 가리킬 곳이 없다.
   * 개발 중에 눌러도 아무 일이 일어나지 않아 고장처럼 보이던 자리다.
   */
  it("https 가 아니면 스토어 주소를 그대로 내준다", () => {
    expect(buildInstallIntentUrl("http://localhost:3000/products?sort=popular")).toBe(APP_STORE_URL);
  });
});
