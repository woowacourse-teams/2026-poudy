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

export const getShareRedirectUrl = (text: string, serviceBaseUrl: string): string | null => {
  try {
    const url = new URL(SHARE_REDIRECT_PATH, serviceBaseUrl);
    url.searchParams.set('text', text);

    return url.toString();
  } catch {
    return null;
  }
};
