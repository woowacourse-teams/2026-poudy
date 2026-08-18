import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';

const APP_SCHEME = 'poudy:';
const URL_PATTERN = /https?:\/\/[^\s<>"']+/giu;
const TRAILING_PUNCTUATION = /[),.\]}!?;:]+$/u;

function getSameOriginUrl(text: string, webBaseUrl: string): string | null {
  const match = text.match(URL_PATTERN)?.[0];
  if (!match) {
    return null;
  }

  try {
    const sharedUrl = new URL(match.replace(TRAILING_PUNCTUATION, ''));
    const webUrl = new URL(webBaseUrl);

    return sharedUrl.origin === webUrl.origin ? sharedUrl.toString() : null;
  } catch {
    return null;
  }
}

function getDeepLinkUrl(value: string, webBaseUrl: string): string | null {
  try {
    const deepLink = new URL(value);
    if (deepLink.protocol !== APP_SCHEME || deepLink.hostname === 'expo-sharing') {
      return null;
    }

    const pathname = deepLink.hostname ? `/${deepLink.hostname}${deepLink.pathname}` : deepLink.pathname;
    return new URL(`${pathname}${deepLink.search}${deepLink.hash}`, webBaseUrl).toString();
  } catch {
    return null;
  }
}

export function useExternalEntry(
  options: Readonly<{
    onNavigate(url: string): void;
    onUnsupportedShare(): void;
    webBaseUrl: string;
  }>,
) {
  const { clearSharedPayloads, refreshSharePayloads, sharedPayloads } = useIncomingShare();
  const lastShare = useRef<string | null>(null);

  useEffect(() => {
    const values = sharedPayloads.flatMap((payload) => (payload.value ? [payload.value] : []));
    if (values.length === 0) {
      lastShare.current = null;
      return;
    }

    const signature = values.join('\u0000');
    if (lastShare.current === signature) {
      return;
    }
    lastShare.current = signature;

    const targetUrl = values
      .map((value) => getSameOriginUrl(value, options.webBaseUrl))
      .find((value) => value !== null);

    if (targetUrl) {
      options.onNavigate(targetUrl);
    } else {
      options.onUnsupportedShare();
    }

    clearSharedPayloads();
    void refreshSharePayloads();
  }, [clearSharedPayloads, options, refreshSharePayloads, sharedPayloads]);

  useEffect(() => {
    const handleUrl = (value: string | null) => {
      if (!value) {
        return;
      }

      const targetUrl = getDeepLinkUrl(value, options.webBaseUrl);
      if (targetUrl) {
        options.onNavigate(targetUrl);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    void Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => undefined);

    return () => subscription.remove();
  }, [options]);
}
