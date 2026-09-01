import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';
import type { WebViewNavigation } from 'react-native-webview';

import type { HardwareBackOptions, WebViewBackState } from '@/types/webView';
import { isHomeUrl } from '@/util/webViewRequest';

const EXIT_CONFIRM_WINDOW_MS = 2000;

const EXIT_CONFIRM_MESSAGE = '한 번 더 누르면 종료돼요';

export const useHardwareBack = ({
  onNavigate,
  sourceKey,
  sourceUrl,
  serviceBaseUrl,
  webViewRef,
}: HardwareBackOptions) => {
  const backState = useRef<WebViewBackState>({ canGoBack: false, url: serviceBaseUrl });

  useEffect(() => {
    backState.current = { canGoBack: false, url: sourceUrl };
  }, [sourceKey, sourceUrl]);

  const exitPromptedAt = useRef(0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isHomeUrl(backState.current.url, serviceBaseUrl)) {
        const now = Date.now();

        if (now - exitPromptedAt.current <= EXIT_CONFIRM_WINDOW_MS) {
          return false;
        }

        exitPromptedAt.current = now;
        ToastAndroid.show(EXIT_CONFIRM_MESSAGE, ToastAndroid.SHORT);
        return true;
      }

      if (backState.current.canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }

      onNavigate(serviceBaseUrl);
      return true;
    });

    return () => subscription.remove();
  }, [onNavigate, serviceBaseUrl, webViewRef]);

  return useCallback(
    (state: WebViewNavigation) => {
      backState.current = { canGoBack: state.canGoBack, url: state.url };

      if (!isHomeUrl(state.url, serviceBaseUrl)) {
        exitPromptedAt.current = 0;
      }
    },
    [serviceBaseUrl],
  );
};
