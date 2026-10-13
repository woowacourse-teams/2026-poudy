import { describe, expect, it } from "vitest";

import { isAppVersionAtLeast, requiresUpdateForLogin } from "./app-version";

import type { AppInfo } from "@/lib/types/app-info";

const ANDROID_APP: AppInfo = {
  is_app: true,
  platform: "android",
  app_version: "0.1.5",
  os_version: "14",
  device_model: "SM-S911N",
};

const appOf = (overrides: Partial<AppInfo>): AppInfo => ({ ...ANDROID_APP, ...overrides });

describe("앱 버전 비교", () => {
  it("자리마다 숫자로 비교한다", () => {
    expect(isAppVersionAtLeast("0.1.10", "0.1.9")).toBe(true);
    expect(isAppVersionAtLeast("0.1.5", "0.1.5")).toBe(true);
    expect(isAppVersionAtLeast("0.1.4", "0.1.5")).toBe(false);
    expect(isAppVersionAtLeast("1.0.0", "0.9.9")).toBe(true);
  });
});

describe("로그인을 위한 앱 업데이트 판단", () => {
  it("로그인을 지원하지 않는 안드로이드 앱은 업데이트가 필요하다", () => {
    expect(requiresUpdateForLogin(appOf({ app_version: "0.1.4" }), "0.1.5")).toBe(true);
  });

  it("로그인을 지원하는 버전 이상이면 필요 없다", () => {
    expect(requiresUpdateForLogin(appOf({ app_version: "0.1.5" }), "0.1.5")).toBe(false);
    expect(requiresUpdateForLogin(appOf({ app_version: "0.2.0" }), "0.1.5")).toBe(false);
  });

  it("웹 브라우저는 필요 없다", () => {
    expect(requiresUpdateForLogin({ is_app: false }, "0.1.5")).toBe(false);
  });

  /* iOS 앱은 스토어에 없어 받을 곳이 없다. */
  it("iOS 앱은 필요 없다", () => {
    expect(requiresUpdateForLogin(appOf({ platform: "ios", app_version: "0.1.0" }), "0.1.5")).toBe(false);
  });

  /* 앱이 버전을 못 읽으면 `unknown` 을 보낸다. 갇히게 두지 않는다. */
  it("버전을 읽을 수 없으면 필요 없다", () => {
    expect(requiresUpdateForLogin(appOf({ app_version: "unknown" }), "0.1.5")).toBe(false);
  });
});
