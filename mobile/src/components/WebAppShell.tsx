import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation as NativeWebViewNavigation,
} from 'react-native-webview';

import WebViewError from '@/components/WebViewError';
import WebViewLoading from '@/components/WebViewLoading';
import { useExternalEntry } from '@/hooks/useExternalEntry';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import { useQuickActions } from '@/hooks/useQuickActions';
import { useWebViewNavigation } from '@/hooks/useWebViewNavigation';
import type { WebViewErrorEvent, WebViewNavigationRequest } from '@/types/webView';
import { APPLICATION_NAME, APP_INFO_SCRIPT } from '@/util/appInfo';
import { playSelectionHaptic } from '@/util/haptic';
import { failureOf } from '@/util/webViewFailure';
import { openExternalUrl, shouldLoadInWebView } from '@/util/webViewRequest';
import { shareText } from '@/util/share';

const HAPTIC_SELECTION_MESSAGE = 'poudy:haptic:selection';

const SHARE_MESSAGE_PREFIX = 'poudy:share:';

const serviceBaseUrl = process.env.EXPO_PUBLIC_SERVICE_URL!;
const serviceOrigin = new URL(serviceBaseUrl).origin;

export default function WebAppShell() {
  const webViewRef = useRef<WebView>(null);
  const hasStartedSplashTransitionRef = useRef(false);

  const [isLoadingAnimationRunning, setIsLoadingAnimationRunning] = useState(Platform.OS !== 'android');

  const navigation = useWebViewNavigation(serviceBaseUrl);
  const { fail } = navigation;

  useExternalEntry({ onNavigate: navigation.navigate, serviceBaseUrl });
  useQuickActions({ onNavigate: navigation.navigate, serviceBaseUrl });

  const handleHardwareNavigationChange = useHardwareBack({
    onNavigate: navigation.navigate,
    sourceKey: navigation.key,
    sourceUrl: navigation.url,
    serviceBaseUrl,
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
    (request: WebViewNavigationRequest) => {
      if (shouldLoadInWebView(request.url, serviceOrigin)) {
        return true;
      }

      openExternalUrl(request.url);
      return false;
    },
    [serviceOrigin],
  );

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
    if (Platform.OS !== 'android' || hasStartedSplashTransitionRef.current) {
      return;
    }

    hasStartedSplashTransitionRef.current = true;
    SplashScreen.setOptions({ duration: 0 });
    SplashScreen.hide();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsLoadingAnimationRunning(true);
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
          originWhitelist={[serviceOrigin]}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          source={{ uri: navigation.url }}
          style={styles.webView}
        />

        {navigation.failure ? <WebViewError reason={navigation.failure} onRetry={navigation.reload} /> : null}
      </SafeAreaView>
      {navigation.isLoading && navigation.failure === null && <WebViewLoading isRunning={isLoadingAnimationRunning} />}
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
