import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import WebViewError from '@/components/WebViewError';
import WebViewLoading from '@/components/WebViewLoading';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import type { WebViewErrorEvent, WebViewNavigation } from '@/types/webView';
import { APPLICATION_NAME, APP_INFO_SCRIPT } from '@/util/appInfo';
import { playSelectionHaptic } from '@/util/haptic';
import { failureOf } from '@/util/webViewFailure';
import { openExternalUrl, shouldLoadInWebView } from '@/util/webViewRequest';

interface NavigationRequest {
  readonly url: string;
}

interface WebAppShellProps {
  readonly webBaseUrl: string;
  readonly navigation: WebViewNavigation;
}

const HAPTIC_SELECTION_MESSAGE = 'poudy:haptic:selection';

export default function WebAppShell({ webBaseUrl, navigation }: WebAppShellProps) {
  const webViewRef = useRef<WebView>(null);
  const webOrigin = useMemo(() => new URL(webBaseUrl).origin, [webBaseUrl]);
  const handleNavigationChange = useHardwareBack({
    onNavigate: navigation.navigate,
    webBaseUrl,
    webViewRef,
  });

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
    if (event.nativeEvent.data === HAPTIC_SELECTION_MESSAGE) {
      playSelectionHaptic();
    }
  }, []);

  return (
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

      {navigation.isLoading && navigation.failure === null ? (
        <WebViewLoading continuesFromSplash={navigation.key === 0} />
      ) : null}
      {navigation.failure ? <WebViewError reason={navigation.failure} onRetry={navigation.reload} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
