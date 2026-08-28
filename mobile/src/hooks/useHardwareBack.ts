import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import type { WebViewNavigation } from 'react-native-webview';

import type { HardwareBackOptions } from '@/types/webView';
import { isHomeUrl } from '@/util/webViewRequest';

interface BackState {
  readonly canGoBack: boolean;
  readonly url: string;
}

export const useHardwareBack = ({ onNavigate, sourceKey, sourceUrl, webBaseUrl, webViewRef }: HardwareBackOptions) => {
  const backState = useRef<BackState>({ canGoBack: false, url: webBaseUrl });

  /** 다시 만든 WebView 는 방문 기록이 비어 있다. 직전 상태를 들고 있으면 눌림만 삼켜진다. */
  useEffect(() => {
    backState.current = { canGoBack: false, url: sourceUrl };
  }, [sourceKey, sourceUrl]);

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
