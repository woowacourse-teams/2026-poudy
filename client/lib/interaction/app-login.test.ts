/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canAppLogin, notifyAppLogout, signInWithApp } from "./app-login";

import { ApiError, RegisteredProviderError } from "@/lib/api/client";
import { appLogin } from "@/lib/api/member";

vi.mock("@/lib/api/member", () => ({ appLogin: vi.fn() }));

const postMessage = vi.fn();

const answerFromApp = (detail: unknown) => {
  window.dispatchEvent(new CustomEvent("poudy:login", { detail }));
};

beforeEach(() => {
  Object.defineProperty(window, "ReactNativeWebView", { configurable: true, value: { postMessage } });
  Object.defineProperty(window, "__POUDY_APP_LOGIN__", { configurable: true, value: ["kakao", "google"] });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("앱 로그인 가능 여부", () => {
  it("앱이 알린 제공자만 앱에 맡긴다", () => {
    Object.defineProperty(window, "__POUDY_APP_LOGIN__", { configurable: true, value: ["kakao"] });

    expect(canAppLogin("kakao")).toBe(true);
    expect(canAppLogin("google")).toBe(false);
  });

  it("값을 주입하지 않는 예전 앱과 브라우저는 OAuth 이동으로 로그인한다", () => {
    Object.defineProperty(window, "__POUDY_APP_LOGIN__", { configurable: true, value: undefined });
    expect(canAppLogin("kakao")).toBe(false);

    Object.defineProperty(window, "__POUDY_APP_LOGIN__", { configurable: true, value: ["kakao"] });
    Object.defineProperty(window, "ReactNativeWebView", { configurable: true, value: undefined });
    expect(canAppLogin("kakao")).toBe(false);
  });
});

describe("앱 로그인", () => {
  it("앱에 로그인을 요청하고 받은 토큰을 세션으로 바꾼 뒤 결과 화면 주소를 돌려준다", async () => {
    vi.mocked(appLogin).mockResolvedValue({ status: "WITHDRAWN" });

    const pending = signInWithApp("kakao");
    answerFromApp({ provider: "kakao", status: "success", token: "access-token" });

    await expect(pending).resolves.toEqual({ kind: "callback", url: "/login/callback?status=WITHDRAWN" });
    expect(postMessage).toHaveBeenCalledWith("poudy:login:kakao");
    expect(appLogin).toHaveBeenCalledWith("kakao", "access-token");
  });

  it("다른 제공자의 결과나 모양이 다른 값은 무시하고 기다린다", async () => {
    vi.mocked(appLogin).mockResolvedValue({ status: "SIGNED_IN" });

    const pending = signInWithApp("google");
    answerFromApp({ provider: "kakao", status: "success", token: "access-token" });
    answerFromApp({ provider: "google", status: "success" });
    answerFromApp({ provider: "google", status: "success", token: "id-token" });

    await expect(pending).resolves.toEqual({ kind: "callback", url: "/login/callback?status=SIGNED_IN" });
    expect(appLogin).toHaveBeenCalledTimes(1);
    expect(appLogin).toHaveBeenCalledWith("google", "id-token");
  });

  it("다시 요청하면 이전 요청은 결과 없이 끝나고 새 요청이 결과를 받는다", async () => {
    vi.mocked(appLogin).mockResolvedValue({ status: "SIGNED_IN" });

    const stuck = signInWithApp("kakao");
    const retried = signInWithApp("kakao");
    answerFromApp({ provider: "kakao", status: "success", token: "access-token" });

    await expect(stuck).resolves.toEqual({ kind: "none" });
    await expect(retried).resolves.toEqual({ kind: "callback", url: "/login/callback?status=SIGNED_IN" });
    expect(appLogin).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledTimes(2);
  });

  it("사용자가 취소하면 화면을 옮기지 않는다", async () => {
    const pending = signInWithApp("kakao");
    answerFromApp({ provider: "kakao", status: "cancelled" });

    await expect(pending).resolves.toEqual({ kind: "none" });
    expect(appLogin).not.toHaveBeenCalled();
  });

  it("앱이 이 제공자를 네이티브로 로그인할 수 없으면 WebView 안 OAuth 로그인으로 돌린다", async () => {
    const pending = signInWithApp("kakao");
    answerFromApp({ provider: "kakao", status: "unavailable" });

    await expect(pending).resolves.toEqual({ kind: "webLogin" });
    expect(appLogin).not.toHaveBeenCalled();
  });

  it("앱이 토큰을 받지 못하면 로그인 실패 화면으로 보낸다", async () => {
    const pending = signInWithApp("kakao");
    answerFromApp({ provider: "kakao", status: "failed" });

    await expect(pending).resolves.toEqual({ kind: "callback", url: "/login/callback?error=OAUTH_LOGIN_FAILED" });
  });

  it("서버가 거절하면 오류 코드를, 이미 가입한 이메일이면 먼저 가입한 제공자도 넘긴다", async () => {
    const registered = new RegisteredProviderError(
      new ApiError(400, "MEMBER_EMAIL_ALREADY_REGISTERED", "이미 가입한 이메일입니다."),
      "KAKAO",
    );
    vi.mocked(appLogin)
      .mockRejectedValueOnce(new ApiError(400, "OAUTH_EMAIL_NOT_VERIFIED", "인증된 이메일이 아닙니다."))
      .mockRejectedValueOnce(registered);

    const unverified = signInWithApp("google");
    answerFromApp({ provider: "google", status: "success", token: "id-token" });
    await expect(unverified).resolves.toEqual({
      kind: "callback",
      url: "/login/callback?error=OAUTH_EMAIL_NOT_VERIFIED",
    });

    const duplicated = signInWithApp("google");
    answerFromApp({ provider: "google", status: "success", token: "id-token" });
    await expect(duplicated).resolves.toEqual({
      kind: "callback",
      url: "/login/callback?error=MEMBER_EMAIL_ALREADY_REGISTERED&provider=KAKAO",
    });
  });
});

describe("앱 로그아웃 알림", () => {
  it("앱에 제공자 로그인 상태를 정리하게 한다", () => {
    notifyAppLogout();

    expect(postMessage).toHaveBeenCalledWith("poudy:logout");
  });
});
