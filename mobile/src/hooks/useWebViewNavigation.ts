import { useNetworkState } from 'expo-network';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';

import type {
  WebViewErrorEvent,
  WebViewFailure,
  WebViewNavigation,
  WebViewNavigationRequest,
  WebViewSource,
} from '@/types/webView';
import { failureOf } from '@/util/webViewFailure';
import { isHttpUrl, openExternalUrl, shouldLoadInWebView } from '@/util/webViewRequest';

const LOAD_TIMEOUT_MS = 10_000;

export const useWebViewNavigation = (
  serviceBaseUrl: string,
  webViewRef: RefObject<WebView | null>,
): WebViewNavigation => {
  const currentUrlRef = useRef(serviceBaseUrl);
  const isWebLoginRef = useRef(false);
  const hasLeftServiceRef = useRef(false);
  const hasReturnedRef = useRef(false);

  const [source, setSource] = useState<WebViewSource>({ key: 0, url: serviceBaseUrl });
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<WebViewFailure | null>(null);

  const { isConnected } = useNetworkState();

  const serviceOrigin = new URL(serviceBaseUrl).origin;

  const fail = useCallback(
    (reason: WebViewFailure) => {
      setFailure(isConnected === false ? 'offline' : reason);
      setIsLoading(false);
    },
    [isConnected],
  );

  const navigate = useCallback((url: string) => {
    if (currentUrlRef.current === url) {
      return;
    }

    currentUrlRef.current = url;
    setFailure(null);
    setIsLoading(true);
    setSource((current) => ({ ...current, url }));
  }, []);

  const reload = useCallback(() => {
    setFailure(null);
    setIsLoading(true);
    setSource((current) => ({ ...current, key: current.key + 1 }));
  }, []);

  const startWebLogin = useCallback(() => {
    isWebLoginRef.current = true;
    hasLeftServiceRef.current = false;
  }, []);

  const handleShouldStartLoad = useCallback(
    ({ url }: WebViewNavigationRequest) => {
      if (shouldLoadInWebView(url, serviceOrigin)) {
        if (isWebLoginRef.current && hasLeftServiceRef.current) {
          isWebLoginRef.current = false;
          hasReturnedRef.current = true;
        }
        return true;
      }

      if (isWebLoginRef.current && isHttpUrl(url)) {
        hasLeftServiceRef.current = true;
        return true;
      }

      openExternalUrl(url);
      return false;
    },
    [serviceOrigin],
  );

  const handleLoad = useCallback(() => {
    setFailure(null);
    setIsLoading(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);

    if (!hasReturnedRef.current) {
      return;
    }

    hasReturnedRef.current = false;
    webViewRef.current?.clearHistory?.();
  }, [webViewRef]);

  const handleError = useCallback(
    (event: WebViewErrorEvent) => {
      fail(failureOf(event.nativeEvent));
    },
    [fail],
  );

  const handleHttpError = useCallback(() => {
    fail('server');
  }, [fail]);

  const handleUrlChange = useCallback((url: string) => {
    currentUrlRef.current = url;
  }, []);

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }

    const timer = setTimeout(() => fail('timeout'), LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [fail, isLoading, source]);

  return {
    key: source.key,
    url: source.url,
    isLoading,
    failure,
    navigate,
    reload,
    startWebLogin,
    handleShouldStartLoad,
    handleUrlChange,
    handleLoad,
    handleLoadEnd,
    handleError,
    handleHttpError,
  };
};
