import { useCallback, useRef } from 'react';
import type { WebViewMessageEvent } from 'react-native-webview';

import type { WebViewBridgeOptions } from '@/types/webView';
import { LOGOUT_MESSAGE, loginProviderOf, loginResultScript, loginWith, signOutProviders } from '@/util/appLogin';
import { APP_UPDATE_MESSAGE, startAppUpdate } from '@/util/appUpdate';
import { playSelectionHaptic } from '@/util/haptic';
import { PUSH_PERMISSION_MESSAGE, PUSH_TOKEN_MESSAGE, pushTokenResultScript } from '@/util/pushNotification';
import { shareText } from '@/util/share';
import { shouldLoadInWebView } from '@/util/webViewRequest';

const HAPTIC_SELECTION_MESSAGE = 'poudy:haptic:selection';

const SHARE_MESSAGE_PREFIX = 'poudy:share:';

export const useWebViewBridge = ({ onWebLogin, pushToken, serviceOrigin, webViewRef }: WebViewBridgeOptions) => {
  const latestLoginRef = useRef(0);

  const startLogin = useCallback(
    async (message: string) => {
      const provider = loginProviderOf(message);

      if (!provider) {
        return;
      }

      const request = latestLoginRef.current + 1;
      latestLoginRef.current = request;

      const result = await loginWith(provider);

      if (latestLoginRef.current !== request) {
        return;
      }

      if (result.status === 'unavailable') {
        onWebLogin();
      }

      webViewRef.current?.injectJavaScript(loginResultScript(result));
    },
    [onWebLogin, webViewRef],
  );

  return useCallback(
    async (event: WebViewMessageEvent) => {
      const { data, url } = event.nativeEvent;

      if (!shouldLoadInWebView(url, serviceOrigin)) {
        return;
      }

      if (data === HAPTIC_SELECTION_MESSAGE) {
        await playSelectionHaptic();
        return;
      }

      if (data.startsWith(SHARE_MESSAGE_PREFIX)) {
        await shareText(data.slice(SHARE_MESSAGE_PREFIX.length));
        return;
      }

      if (data === APP_UPDATE_MESSAGE) {
        await startAppUpdate();
        return;
      }

      if (data === LOGOUT_MESSAGE) {
        await signOutProviders();
        return;
      }

      if (data === PUSH_TOKEN_MESSAGE) {
        const result = await pushToken.read();
        webViewRef.current?.injectJavaScript(pushTokenResultScript(result));
        return;
      }

      if (data === PUSH_PERMISSION_MESSAGE) {
        const result = await pushToken.request();
        webViewRef.current?.injectJavaScript(pushTokenResultScript(result));
        return;
      }

      await startLogin(data);
    },
    [pushToken, serviceOrigin, startLogin, webViewRef],
  );
};
