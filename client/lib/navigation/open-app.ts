export type AndroidMobileBrowser = "kakao" | "other";

export type AppOpenPlan =
  | { readonly type: "none" }
  | { readonly type: "clean-fallback"; readonly webUrl: string }
  | { readonly type: "open-app"; readonly appUrl: string };

const ANDROID = /Android/i;
const KAKAO = /KAKAOTALK/i;
const ANDROID_PACKAGE = "com.poudy.app";

const FALLBACK_PARAM = "_poudy_app_fallback";

export const detectAndroidMobileBrowser = (userAgent: string): AndroidMobileBrowser | null => {
  if (!ANDROID.test(userAgent)) return null;

  return KAKAO.test(userAgent) ? "kakao" : "other";
};

const addFallbackMarker = (webUrl: string): string => {
  const url = new URL(webUrl);
  url.searchParams.set(FALLBACK_PARAM, "1");

  return url.href;
};

export const consumeFallbackMarker = (webUrl: string): string | null => {
  const url = new URL(webUrl);
  if (!url.searchParams.has(FALLBACK_PARAM)) return null;

  url.searchParams.delete(FALLBACK_PARAM);

  return url.href;
};

// 카카오톡은 intent 스킴을 막을 수 있어 현재 주소를 OS 에 다시 넘긴다.
export const buildKakaoExternalUrl = (webUrl: string): string =>
  `kakaotalk://web/openExternal?url=${encodeURIComponent(addFallbackMarker(webUrl))}`;

export const buildAndroidIntentUrl = (webUrl: string): string => {
  const url = new URL(webUrl);
  const destination = `${url.host}${url.pathname}${url.search}`;
  const fallbackUrl = addFallbackMarker(url.href);

  return `intent://${destination}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
};

export const buildOpenAppUrl = (webUrl: string, browser: AndroidMobileBrowser): string =>
  browser === "kakao" ? buildKakaoExternalUrl(webUrl) : buildAndroidIntentUrl(webUrl);

export const planAppOpen = (webUrl: string, userAgent: string, isPoudyApp: boolean): AppOpenPlan => {
  const cleanWebUrl = consumeFallbackMarker(webUrl);
  if (cleanWebUrl) return { type: "clean-fallback", webUrl: cleanWebUrl };
  if (isPoudyApp) return { type: "none" };

  const browser = detectAndroidMobileBrowser(userAgent);
  if (!browser) return { type: "none" };

  return { type: "open-app", appUrl: buildOpenAppUrl(webUrl, browser) };
};
