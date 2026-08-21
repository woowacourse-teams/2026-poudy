import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import type { WebView, WebViewNavigation } from 'react-native-webview';

import { isHomeUrl } from '@/util/webViewRequest';

interface HardwareBackOptions {
  readonly onNavigate: (url: string) => void;
  readonly webBaseUrl: string;
  readonly webViewRef: RefObject<WebView | null>;
}

interface BackState {
  readonly canGoBack: boolean;
  readonly url: string;
}

export const useHardwareBack = ({ onNavigate, webBaseUrl, webViewRef }: HardwareBackOptions) => {
  const backState = useRef<BackState>({ canGoBack: false, url: webBaseUrl });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (backState.current.canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }

      if (isHomeUrl(backState.current.url, webBaseUrl)) {
        return false;
      }

      onNavigate(webBaseUrl);
      return true;
    });

    return () => subscription.remove();
  }, [onNavigate, webBaseUrl, webViewRef]);

  return useCallback((state: WebViewNavigation) => {
    backState.current = { canGoBack: state.canGoBack, url: state.url };
  }, []);
};
