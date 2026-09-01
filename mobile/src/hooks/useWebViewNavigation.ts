import { useNetworkState } from 'expo-network';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { WebViewFailure, WebViewNavigation, WebViewSource } from '@/types/webView';

const LOAD_TIMEOUT_MS = 10_000;

export const useWebViewNavigation = (initialUrl: string): WebViewNavigation => {
  const [source, setSource] = useState<WebViewSource>({ key: 0, url: initialUrl });
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<WebViewFailure | null>(null);
  const currentUrlRef = useRef(initialUrl);

  const { isConnected } = useNetworkState();

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

  const handleLoad = useCallback(() => {
    setFailure(null);
    setIsLoading(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

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
    handleUrlChange,
    handleLoad,
    handleLoadEnd,
    fail,
  };
};
