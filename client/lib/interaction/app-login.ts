import { z } from "zod";

import { ApiError, RegisteredProviderError } from "@/lib/api/client";
import { appLogin, type SocialProvider } from "@/lib/api/member";

declare global {
  interface Window {
    readonly __POUDY_APP_LOGIN__?: unknown;
  }
}

const LOGIN_MESSAGE_PREFIX = "poudy:login:";
const LOGIN_RESULT_EVENT = "poudy:login";
const LOGOUT_MESSAGE = "poudy:logout";
const LOGIN_FAILED = "OAUTH_LOGIN_FAILED";

const AppLoginProviders = z.array(z.string());

const Provider = z.enum(["kakao", "google"]);

const ProviderTokenResult = z.union([
  z.object({ provider: Provider, status: z.literal("success"), token: z.string().min(1) }),
  z.object({ provider: Provider, status: z.enum(["cancelled", "failed", "unavailable"]) }),
]);

type ProviderTokenResult = z.infer<typeof ProviderTokenResult>;

/**
 * 앱이 이 제공자를 네이티브 SDK 로 로그인해 주면 참이다. 브라우저와 이 값을 주입하지 않는
 * 예전 앱은 거짓이라 OAuth 주소로 이동해 로그인한다.
 */
export const canAppLogin = (provider: SocialProvider): boolean => {
  if (!window.ReactNativeWebView) return false;

  const providers = AppLoginProviders.safeParse(window.__POUDY_APP_LOGIN__);

  return providers.success && providers.data.includes(provider);
};

/** 지금 기다리는 앱 로그인을 끝낸다. 새 요청이 이전 요청을 대신할 때 부른다. */
let releaseWaiting: (() => void) | null = null;

/**
 * 앱에 로그인을 맡기고, 앱이 `poudy:login` 이벤트로 돌려주는 결과를 기다린다.
 * 다시 요청하면 이전 요청은 결과 없이(null) 끝난다. 앱의 SDK 가 결과를 돌려주지 않아도
 * 다시 눌러 새로 시작할 수 있게 하기 위해서다.
 */
const requestProviderToken = (provider: SocialProvider): Promise<ProviderTokenResult | null> =>
  new Promise((resolve) => {
    releaseWaiting?.();

    const stopWaiting = () => {
      window.removeEventListener(LOGIN_RESULT_EVENT, receive);
      if (releaseWaiting === release) releaseWaiting = null;
    };
    const release = () => {
      stopWaiting();
      resolve(null);
    };
    const receive = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;

      const result = ProviderTokenResult.safeParse(event.detail);
      if (!result.success || result.data.provider !== provider) return;

      stopWaiting();
      resolve(result.data);
    };

    releaseWaiting = release;
    window.addEventListener(LOGIN_RESULT_EVENT, receive);
    window.ReactNativeWebView?.postMessage(`${LOGIN_MESSAGE_PREFIX}${provider}`);
  });

const callbackUrl = (params: Readonly<Record<string, string>>): string =>
  `/login/callback?${new URLSearchParams(params)}`;

const failureUrl = (error: unknown): string => {
  if (error instanceof RegisteredProviderError) return callbackUrl({ error: error.code, provider: error.provider });
  if (error instanceof ApiError) return callbackUrl({ error: error.code });
  return callbackUrl({ error: LOGIN_FAILED });
};

/**
 * 앱 로그인의 결과. 서버 세션을 만들었거나 실패했으면 `/login/callback` 주소를, 앱이 이 제공자의
 * 네이티브 로그인을 할 수 없으면(카카오톡이 없을 때) WebView 안 OAuth 로그인을, 사용자가
 * 취소했거나 새 요청으로 대신했으면 none 을 돌려준다.
 */
export type AppSignIn =
  { readonly kind: "callback"; readonly url: string } | { readonly kind: "webLogin" } | { readonly kind: "none" };

const NONE: AppSignIn = { kind: "none" };

const toCallback = (params: Readonly<Record<string, string>>): AppSignIn => ({
  kind: "callback",
  url: callbackUrl(params),
});

const missingTokenSignIn = (status: "cancelled" | "failed" | "unavailable"): AppSignIn => {
  if (status === "unavailable") return { kind: "webLogin" };
  if (status === "failed") return toCallback({ error: LOGIN_FAILED });
  return NONE;
};

/** 앱이 받은 제공자 토큰을 세션으로 바꾸고, 웹 로그인과 같은 화면 분기를 쓴다. */
export const signInWithApp = async (provider: SocialProvider): Promise<AppSignIn> => {
  const result = await requestProviderToken(provider);

  if (result === null) return NONE;
  if (result.status !== "success") return missingTokenSignIn(result.status);

  try {
    const { status } = await appLogin(provider, result.token);
    return toCallback({ status });
  } catch (error) {
    return { kind: "callback", url: failureUrl(error) };
  }
};

/** 로그아웃·탈퇴 뒤 앱이 쥐고 있는 제공자 로그인 상태를 정리하게 한다. */
export const notifyAppLogout = () => {
  window.ReactNativeWebView?.postMessage(LOGOUT_MESSAGE);
};
