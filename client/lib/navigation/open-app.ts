export type AndroidMobileBrowser = "kakao" | "other";

export type AppOpenPlan =
  | { readonly type: "none" }
  | { readonly type: "clean-url"; readonly webUrl: string }
  | { readonly type: "open-app"; readonly appUrl: string; readonly webUrl: string };

const ANDROID = /Android/i;
const KAKAO = /KAKAOTALK/i;
const ANDROID_PACKAGE = "com.poudy.app";

const SHARE_PARAM = "share";

const FALLBACK_PARAM = "_poudy_app_fallback";

export const detectAndroidMobileBrowser = (userAgent: string): AndroidMobileBrowser | null => {
  if (!ANDROID.test(userAgent)) return null;

  return KAKAO.test(userAgent) ? "kakao" : "other";
};

export const addShareMarker = (webUrl: string): string => {
  const url = new URL(webUrl);
  url.searchParams.set(SHARE_PARAM, "true");

  return url.href;
};

export const consumeShareMarker = (webUrl: string): string | null => {
  const url = new URL(webUrl);
  if (url.searchParams.get(SHARE_PARAM) !== "true") return null;

  url.searchParams.delete(SHARE_PARAM);

  return url.href;
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

export const APP_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&pcampaignid=web_share`;

/**
 * 설치 배너가 쓰는 주소. 보던 화면을 그대로 이어 열되, 앱이 없으면 스토어로 보낸다.
 *
 * `buildAndroidIntentUrl` 과 경로를 담는 방식은 같고 되돌아갈 곳만 다르다. 그쪽은
 * 공유로 들어온 사람을 원래 웹 화면에 남기지만, 배너는 설치를 권하는 자리라 받을 수
 * 있는 곳으로 보내야 한다.
 *
 * https 가 아니면 스토어 주소를 그대로 내준다. intent 는 `scheme=https` 로 앱을
 * 찾으므로 http 인 localhost 에서는 가리킬 곳이 없다. 개발 중에 눌러도 아무 일이
 * 일어나지 않아 고장처럼 보이던 자리다. App Links 도 https 로만 검증된다.
 */
export const buildInstallIntentUrl = (webUrl: string): string => {
  const url = new URL(webUrl);
  if (url.protocol !== "https:") return APP_STORE_URL;

  const destination = `${url.host}${url.pathname}${url.search}`;

  return `intent://${destination}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(APP_STORE_URL)};end`;
};

/** 앱 설치 QR 코드가 담는 경로. 앱이 이 도메인의 모든 경로를 App Links 로 받는다. */
export const OPEN_APP_PATH = "/open-app";

/**
 * QR 코드로 들어온 `/open-app` 에서 이어 갈 주소를 고른다.
 *
 * QR 코드에 스토어 주소를 그대로 담으면 구글 도메인이라 앱이 깔려 있어도 스토어가 열린다.
 * 그렇다고 `intent://` 를 담을 수도 없다. 카메라 앱은 이 스킴을 열지 못하고 브라우저
 * 안에서 옮겨 갈 때만 통한다. 그래서 우리 주소를 담고 여기서 갈래를 나눈다.
 *
 * 앱이 있으면 대개 App Links 가 주소를 가로채 이 화면까지 오지 않는다. 그래도 앱은 받은
 * 주소를 웹뷰에 그대로 열므로 앱 안에서도 이 화면에 닿는다. 그때 스토어로 보내면 쓰던
 * 앱에서 밀려나므로 홈으로 보낸다.
 *
 * 브라우저에 닿은 안드로이드는 설치 배너와 같은 길로 보낸다. 앱이 있으면 열고 없으면
 * 스토어로 간다. 홈을 담는 까닭은 `/open-app` 을 담으면 앱이 이 화면을 다시 열기 때문이다.
 */
export const resolveOpenAppDestination = (webUrl: string, userAgent: string, isPoudyApp: boolean): string => {
  const homeUrl = new URL("/", webUrl).href;

  if (isPoudyApp) return homeUrl;
  if (!ANDROID.test(userAgent)) return APP_STORE_URL;

  return buildInstallIntentUrl(homeUrl);
};

export const planAppOpen = (webUrl: string, userAgent: string, isPoudyApp: boolean): AppOpenPlan => {
  const fallbackWebUrl = consumeFallbackMarker(webUrl);
  const cleanWebUrl = consumeShareMarker(fallbackWebUrl ?? webUrl);
  if (fallbackWebUrl) return { type: "clean-url", webUrl: cleanWebUrl ?? fallbackWebUrl };
  if (!cleanWebUrl) return { type: "none" };
  if (isPoudyApp) return { type: "clean-url", webUrl: cleanWebUrl };

  const browser = detectAndroidMobileBrowser(userAgent);
  if (!browser) return { type: "clean-url", webUrl: cleanWebUrl };

  return { type: "open-app", appUrl: buildOpenAppUrl(cleanWebUrl, browser), webUrl: cleanWebUrl };
};
