import { useCallback, useRef } from 'react';
import type { WebViewMessageEvent } from 'react-native-webview';

import type { WebViewBridgeOptions } from '@/types/webView';
import { LOGOUT_MESSAGE, loginProviderOf, loginResultScript, loginWith, signOutProviders } from '@/util/appLogin';
import { playSelectionHaptic } from '@/util/haptic';
import { shareText } from '@/util/share';
import { shouldLoadInWebView } from '@/util/webViewRequest';

const HAPTIC_SELECTION_MESSAGE = 'poudy:haptic:selection';

const SHARE_MESSAGE_PREFIX = 'poudy:share:';

export const useWebViewBridge = ({ onWebLogin, serviceOrigin, webViewRef }: WebViewBridgeOptions) => {
  const latestLoginRef = useRef(0);

  const startLogin = useCallback(
    (message: string) => {
      const provider = loginProviderOf(message);

      if (!provider) {
        return;
      }

      const request = latestLoginRef.current + 1;
      latestLoginRef.current = request;

      void loginWith(provider).then((result) => {
        if (latestLoginRef.current !== request) {
          return;
        }

        if (result.status === 'unavailable') {
          onWebLogin();
        }

        webViewRef.current?.injectJavaScript(loginResultScript(result));
      });
    },
    [onWebLogin, webViewRef],
  );

  return useCallback(
    (event: WebViewMessageEvent) => {
      const { data, url } = event.nativeEvent;

      if (!shouldLoadInWebView(url, serviceOrigin)) {
        return;
      }

      if (data === HAPTIC_SELECTION_MESSAGE) {
        playSelectionHaptic();
        return;
      }

      if (data.startsWith(SHARE_MESSAGE_PREFIX)) {
        void shareText(data.slice(SHARE_MESSAGE_PREFIX.length)).catch(() => undefined);
        return;
      }

      if (data === LOGOUT_MESSAGE) {
        signOutProviders();
        return;
      }

      startLogin(data);
    },
    [serviceOrigin, startLogin],
  );
};
