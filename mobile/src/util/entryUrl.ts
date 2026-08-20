import type { ShareMatchResponse } from '@poudy/api/api.zod';

const APP_SCHEME = 'poudy:';
const SHARE_HOST = 'expo-sharing';
const URL_PATTERN = /https?:\/\/[^\s<>"']+/giu;
const TRAILING_PUNCTUATION = /[),.\]}!?;:]+$/u;
const PRODUCT_PATH = '/products';

export const getSameOriginUrl = (text: string, webBaseUrl: string): string | null => {
  const found = text.match(URL_PATTERN)?.[0];
  if (!found) {
    return null;
  }

  try {
    const sharedUrl = new URL(found.replace(TRAILING_PUNCTUATION, ''));
    const webUrl = new URL(webBaseUrl);

    return sharedUrl.origin === webUrl.origin ? sharedUrl.toString() : null;
  } catch {
    return null;
  }
};

export const getDeepLinkUrl = (value: string, webBaseUrl: string): string | null => {
  try {
    const deepLink = new URL(value);
    if (deepLink.protocol !== APP_SCHEME || deepLink.hostname === SHARE_HOST) {
      return null;
    }

    const pathname = deepLink.hostname ? `/${deepLink.hostname}${deepLink.pathname}` : deepLink.pathname;

    return new URL(`${pathname}${deepLink.search}${deepLink.hash}`, webBaseUrl).toString();
  } catch {
    return null;
  }
};

export const getMatchedUrl = (match: ShareMatchResponse | null, webBaseUrl: string): string | null => {
  if (!match) {
    return null;
  }

  if (match.status === 'MATCHED' && typeof match.productId === 'number') {
    return new URL(`${PRODUCT_PATH}/${match.productId}`, webBaseUrl).toString();
  }

  if (match.status === 'NOT_FOUND' && match.keyword) {
    const url = new URL(PRODUCT_PATH, webBaseUrl);
    url.searchParams.set('keyword', match.keyword);

    return url.toString();
  }

  return null;
};
