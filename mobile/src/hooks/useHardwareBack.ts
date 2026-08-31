import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';
import type { WebViewNavigation } from 'react-native-webview';

import type { HardwareBackOptions } from '@/types/webView';
import { isHomeUrl } from '@/util/webViewRequest';

/** 토스트가 떠 있는 길이와 맞춘다. */
const EXIT_CONFIRM_WINDOW_MS = 2000;

const EXIT_CONFIRM_MESSAGE = '한 번 더 누르면 종료돼요';

interface BackState {
  readonly canGoBack: boolean;
  readonly url: string;
}

export const useHardwareBack = ({
  onNavigate,
  sourceKey,
  sourceUrl,
  serviceBaseUrl,
  webViewRef,
}: HardwareBackOptions) => {
  const backState = useRef<BackState>({ canGoBack: false, url: serviceBaseUrl });

  /** 다시 만든 WebView 는 방문 기록이 비어 있다. 직전 상태를 들고 있으면 눌림만 삼켜진다. */
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
