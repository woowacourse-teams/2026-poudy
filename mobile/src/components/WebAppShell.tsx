import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation as NativeWebViewNavigation,
} from 'react-native-webview';

import WebViewError from '@/components/WebViewError';
import WebViewLoading from '@/components/WebViewLoading';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import type { WebViewErrorEvent, WebViewNavigation } from '@/types/webView';
import { APPLICATION_NAME, APP_INFO_SCRIPT } from '@/util/appInfo';
import { playSelectionHaptic } from '@/util/haptic';
import { failureOf } from '@/util/webViewFailure';
import { openExternalUrl, shouldLoadInWebView } from '@/util/webViewRequest';
import { shareText } from '@/util/share';

interface NavigationRequest {
  readonly url: string;
}

interface WebAppShellProps {
  readonly webBaseUrl: string;
  readonly navigation: WebViewNavigation;
}

const HAPTIC_SELECTION_MESSAGE = 'poudy:haptic:selection';

const SHARE_MESSAGE_PREFIX = 'poudy:share:';

export default function WebAppShell({ webBaseUrl, navigation }: WebAppShellProps) {
  const webViewRef = useRef<WebView>(null);
  const [loadingAnimationRunning, setLoadingAnimationRunning] = useState(Platform.OS !== 'android');
  const splashTransitionStartedRef = useRef(false);
  const webOrigin = useMemo(() => new URL(webBaseUrl).origin, [webBaseUrl]);
  const handleHardwareNavigationChange = useHardwareBack({
    onNavigate: navigation.navigate,
    sourceKey: navigation.key,
    sourceUrl: navigation.url,
    webBaseUrl,
    webViewRef,
  });

  const handleNavigationChange = useCallback(
    (state: NativeWebViewNavigation) => {
      navigation.handleUrlChange(state.url);
      handleHardwareNavigationChange(state);
    },
    [handleHardwareNavigationChange, navigation],
  );

  const handleShouldStartLoad = useCallback(
    (request: NavigationRequest) => {
      if (shouldLoadInWebView(request.url, webOrigin)) {
        return true;
      }

      openExternalUrl(request.url);
      return false;
    },
    [webOrigin],
  );

  const { fail } = navigation;

  const handleError = useCallback(
    (event: WebViewErrorEvent) => {
      fail(failureOf(event.nativeEvent));
    },
    [fail],
  );

  const handleHttpError = useCallback(() => {
    fail('server');
  }, [fail]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    const { data } = event.nativeEvent;

    if (data === HAPTIC_SELECTION_MESSAGE) {
      playSelectionHaptic();
      return;
    }

    if (data.startsWith(SHARE_MESSAGE_PREFIX)) {
      void shareText(data.slice(SHARE_MESSAGE_PREFIX.length)).catch(() => undefined);
    }
  }, []);

  const handleRootLayout = useCallback(() => {
    if (Platform.OS !== 'android' || splashTransitionStartedRef.current) {
      return;
    }

    splashTransitionStartedRef.current = true;
    SplashScreen.setOptions({ duration: 0 });
    SplashScreen.hide();

    // 첫 RAF에서 네이티브 스플래시가 제거되고, 다음 RAF부터 RN 로더를 움직인다.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLoadingAnimationRunning(true);
      });
    });
  }, []);

  return (
    <View onLayout={handleRootLayout} style={styles.root}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
        <WebView
          key={navigation.key}
          ref={webViewRef}
          allowsBackForwardNavigationGestures
          applicationNameForUserAgent={APPLICATION_NAME}
          injectedJavaScriptBeforeContentLoaded={APP_INFO_SCRIPT}
          javaScriptCanOpenWindowsAutomatically={false}
          mixedContentMode='never'
          onError={handleError}
          onHttpError={handleHttpError}
          onLoad={navigation.handleLoad}
          onLoadEnd={navigation.handleLoadEnd}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          originWhitelist={[webOrigin]}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          source={{ uri: navigation.url }}
          style={styles.webView}
        />

        {navigation.failure ? <WebViewError reason={navigation.failure} onRetry={navigation.reload} /> : null}
      </SafeAreaView>
      {navigation.isLoading && navigation.failure === null ? (
        <WebViewLoading running={loadingAnimationRunning} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
