import { useCallback, useState } from 'react';

import type { WebViewNavigation } from '@/types/webView';

interface WebViewSource {
  readonly key: number;
  readonly url: string;
}

export const useWebViewNavigation = (initialUrl: string): WebViewNavigation => {
  const [source, setSource] = useState<WebViewSource>({ key: 0, url: initialUrl });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const navigate = useCallback((url: string) => {
    setHasError(false);
    setIsLoading(true);
    setSource((current) => ({ key: current.key + 1, url }));
  }, []);

  const reload = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setSource((current) => ({ ...current, key: current.key + 1 }));
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleFailure = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  return {
    key: source.key,
    url: source.url,
    isLoading,
    hasError,
    navigate,
    reload,
    handleLoadEnd,
    handleFailure,
  };
};
