import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import type { WebViewNavigation } from 'react-native-webview';

import type { HardwareBackOptions } from '@/types/webView';
import { isHomeUrl } from '@/util/webViewRequest';

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
