import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation as NativeWebViewNavigation } from 'react-native-webview';

import WebViewError from '@/components/WebViewError';
import WebViewLoading from '@/components/WebViewLoading';
import { useExternalEntry } from '@/hooks/useExternalEntry';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useQuickActions } from '@/hooks/useQuickActions';
import { useSplashTransition } from '@/hooks/useSplashTransition';
import { useWebViewBridge } from '@/hooks/useWebViewBridge';
import { useWebViewNavigation } from '@/hooks/useWebViewNavigation';
import { APPLICATION_NAME, WEBVIEW_INIT_SCRIPT } from '@/util/appInfo';
import { WEB_ORIGIN_WHITELIST } from '@/util/webViewRequest';

const serviceBaseUrl = process.env.EXPO_PUBLIC_SERVICE_URL!;
const serviceOrigin = new URL(serviceBaseUrl).origin;

export default function WebAppShell() {
  const webViewRef = useRef<WebView>(null);

  const navigation = useWebViewNavigation(serviceBaseUrl, webViewRef);
  const keyboardInset = useKeyboardInset();
  const splash = useSplashTransition();
  const handleMessage = useWebViewBridge({ onWebLogin: navigation.startWebLogin, serviceOrigin, webViewRef });

  useExternalEntry({ onNavigate: navigation.navigate, serviceBaseUrl });
  useQuickActions({ onNavigate: navigation.navigate, serviceBaseUrl });

  const handleHardwareNavigationChange = useHardwareBack({
    onNavigate: navigation.navigate,
    sourceKey: navigation.key,
    sourceUrl: navigation.url,
    serviceBaseUrl,
    webViewRef,
  });

  const { handleUrlChange } = navigation;
  const handleNavigationChange = useCallback(
    (state: NativeWebViewNavigation) => {
      handleUrlChange(state.url);
      handleHardwareNavigationChange(state);
    },
    [handleHardwareNavigationChange, handleUrlChange],
  );

  return (
    <View onLayout={splash.handleRootLayout} style={styles.root}>
      <SafeAreaView
        edges={['top', 'right', 'bottom', 'left']}
        style={[styles.safeArea, { paddingBottom: keyboardInset }]}
      >
        <WebView
          key={navigation.key}
          ref={webViewRef}
          allowsBackForwardNavigationGestures
          applicationNameForUserAgent={APPLICATION_NAME}
          bottomBounces={false}
          injectedJavaScriptBeforeContentLoaded={WEBVIEW_INIT_SCRIPT}
          javaScriptCanOpenWindowsAutomatically={false}
          mixedContentMode='never'
          onError={navigation.handleError}
          onHttpError={navigation.handleHttpError}
          onLoad={navigation.handleLoad}
          onLoadEnd={navigation.handleLoadEnd}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={navigation.handleShouldStartLoad}
          originWhitelist={WEB_ORIGIN_WHITELIST}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          showsVerticalScrollIndicator={false}
          source={{ uri: navigation.url }}
          style={styles.webView}
        />

        {navigation.failure ? <WebViewError reason={navigation.failure} onRetry={navigation.reload} /> : null}
      </SafeAreaView>
      {navigation.isLoading && navigation.failure === null && (
        <WebViewLoading isRunning={splash.isLoadingAnimationRunning} />
      )}
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
