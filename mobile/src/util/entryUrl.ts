const APP_SCHEME = 'poudy:';
const SHARE_HOST = 'expo-sharing';
const URL_PATTERN = /https?:\/\/[^\s<>"']+/giu;
const TRAILING_PUNCTUATION = /[),.\]}!?;:]+$/u;
const SHARE_REDIRECT_PATH = '/share/redirect';

export const getSameOriginUrl = (text: string, serviceBaseUrl: string): string | null => {
  const found = text.match(URL_PATTERN)?.[0];
  if (!found) {
    return null;
  }

  try {
    const sharedUrl = new URL(found.replace(TRAILING_PUNCTUATION, ''));
    const serviceUrl = new URL(serviceBaseUrl);

    return sharedUrl.origin === serviceUrl.origin ? sharedUrl.toString() : null;
  } catch {
    return null;
  }
};

export const getDeepLinkUrl = (value: string, serviceBaseUrl: string): string | null => {
  try {
    const deepLink = new URL(value);

    // App Links 로 받은 주소다.
    if (deepLink.origin === new URL(serviceBaseUrl).origin) {
      return deepLink.toString();
    }

    if (deepLink.protocol !== APP_SCHEME || deepLink.hostname === SHARE_HOST) {
      return null;
    }

    const pathname = deepLink.hostname ? `/${deepLink.hostname}${deepLink.pathname}` : deepLink.pathname;

    return new URL(`${pathname}${deepLink.search}${deepLink.hash}`, serviceBaseUrl).toString();
  } catch {
    return null;
  }
};

/**
 * 공유 원문을 웹의 경유 경로로 넘긴다. 어느 제품인지 정하는 일은 웹이 맡으므로
 * 앱은 API 주소를 알 필요가 없고, API 도메인이 바뀌어도 다시 빌드하지 않는다.
 */
export const getShareRedirectUrl = (text: string, serviceBaseUrl: string): string | null => {
  try {
    const url = new URL(SHARE_REDIRECT_PATH, serviceBaseUrl);
    url.searchParams.set('text', text);

    return url.toString();
  } catch {
    return null;
  }
};
