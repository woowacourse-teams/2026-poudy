import { useCallback, useState } from 'react';

interface WebViewSource {
  readonly key: number;
  readonly url: string;
}

export interface WebViewNavigation {
  readonly key: number;
  readonly url: string;
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly navigate: (url: string) => void;
  readonly reload: () => void;
  readonly handleLoadEnd: () => void;
  readonly handleFailure: () => void;
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
