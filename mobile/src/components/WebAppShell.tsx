import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation as WebViewNavigationState,
} from 'react-native-webview';

import AppTopBar from '@/components/AppTopBar';
import WebViewError from '@/components/WebViewError';
import WebViewLoading from '@/components/WebViewLoading';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import type { WebViewErrorEvent, WebViewNavigation } from '@/types/webView';
import { APPLICATION_NAME, APP_INFO_SCRIPT } from '@/util/appInfo';
import { APP_FRAME_SCRIPT, isDetailUrl } from '@/util/appFrame';
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

const BEFORE_CONTENT_SCRIPT = `${APP_INFO_SCRIPT ?? ''}${APP_FRAME_SCRIPT}`;

interface PageState {
  readonly canGoBack: boolean;
  readonly url: string;
}

export default function WebAppShell({ webBaseUrl, navigation }: WebAppShellProps) {
  const webViewRef = useRef<WebView>(null);
  const [initialFoldComplete, setInitialFoldComplete] = useState(false);
  const [loadingAnimationRunning, setLoadingAnimationRunning] = useState(Platform.OS !== 'android');
  const splashTransitionStartedRef = useRef(false);
  const [page, setPage] = useState<PageState>({ canGoBack: false, url: webBaseUrl });
  const webOrigin = useMemo(() => new URL(webBaseUrl).origin, [webBaseUrl]);
  const handleHardwareBackState = useHardwareBack({
    onNavigate: navigation.navigate,
    sourceKey: navigation.key,
    sourceUrl: navigation.url,
    webBaseUrl,
    webViewRef,
  });

  const handleNavigationChange = useCallback(
    (state: WebViewNavigationState) => {
      handleHardwareBackState(state);
      setPage({ canGoBack: state.canGoBack, url: state.url });
    },
    [handleHardwareBackState],
  );

  const { navigate } = navigation;

  const handleBack = useCallback(() => {
    if (page.canGoBack) {
      webViewRef.current?.goBack();
      return;
    }

    navigate(webBaseUrl);
  }, [navigate, page.canGoBack, webBaseUrl]);

  const handleHome = useCallback(() => {
    navigate(webBaseUrl);
  }, [navigate, webBaseUrl]);

  const handleShare = useCallback(() => {
    void Share.share({ message: page.url }).catch(() => undefined);
  }, [page.url]);

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

  const handleInitialFoldComplete = useCallback(() => {
    setInitialFoldComplete(true);
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

  const shouldShowLoading = navigation.isLoading || (navigation.key === 0 && !initialFoldComplete);

  return (
    <View onLayout={handleRootLayout} style={styles.root}>
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
        {isDetailUrl(page.url, webBaseUrl) ? (
          <AppTopBar onBack={handleBack} onHome={handleHome} onShare={handleShare} />
        ) : null}

        <WebView
          key={navigation.key}
          ref={webViewRef}
          allowsBackForwardNavigationGestures
          applicationNameForUserAgent={APPLICATION_NAME}
          injectedJavaScriptBeforeContentLoaded={BEFORE_CONTENT_SCRIPT}
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
      {shouldShowLoading && navigation.failure === null ? (
        <WebViewLoading
          onInitialFoldComplete={navigation.key === 0 ? handleInitialFoldComplete : undefined}
          running={loadingAnimationRunning}
        />
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
