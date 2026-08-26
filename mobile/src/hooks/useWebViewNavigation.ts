import { useNetworkState } from 'expo-network';
import { useCallback, useEffect, useState } from 'react';

import type { WebViewFailure, WebViewNavigation } from '@/types/webView';

const LOAD_TIMEOUT_MS = 10_000;

interface WebViewSource {
  readonly key: number;
  readonly url: string;
}

export const useWebViewNavigation = (initialUrl: string): WebViewNavigation => {
  const [source, setSource] = useState<WebViewSource>({ key: 0, url: initialUrl });
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<WebViewFailure | null>(null);

  const { isConnected } = useNetworkState();

  const fail = useCallback(
    (reason: WebViewFailure) => {
      setFailure(isConnected === false ? 'offline' : reason);
      setIsLoading(false);
    },
    [isConnected],
  );

  const navigate = useCallback((url: string) => {
    setFailure(null);
    setIsLoading(true);
    setSource((current) => ({ key: current.key + 1, url }));
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

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }

    const timer = setTimeout(() => fail('timeout'), LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [fail, isLoading, source.key]);

  return {
    key: source.key,
    url: source.url,
    isLoading,
    failure,
    navigate,
    reload,
    handleLoad,
    handleLoadEnd,
    fail,
  };
};
