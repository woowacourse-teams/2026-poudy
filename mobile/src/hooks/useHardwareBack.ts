import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import type { WebView, WebViewNavigation } from 'react-native-webview';

export const useHardwareBack = (webViewRef: RefObject<WebView | null>) => {
  const canGoBack = useRef(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) {
        return false;
      }

      webViewRef.current?.goBack();
      return true;
    });

    return () => subscription.remove();
  }, [webViewRef]);

  return useCallback((state: WebViewNavigation) => {
    canGoBack.current = state.canGoBack;
  }, []);
};
