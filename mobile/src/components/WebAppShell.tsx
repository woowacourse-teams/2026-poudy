import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';

import { useExternalEntry } from '@/hooks/useExternalEntry';

type NavigationState = Readonly<{
  key: number;
  url: string;
}>;

export function WebAppShell({ webBaseUrl }: Readonly<{ webBaseUrl: string }>) {
  const webViewRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const webOrigin = useMemo(() => new URL(webBaseUrl).origin, [webBaseUrl]);
  const [navigation, setNavigation] = useState<NavigationState>({
    key: 0,
    url: webBaseUrl,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const navigate = useCallback((url: string) => {
    setHasError(false);
    setNavigation((current) => ({ key: current.key + 1, url }));
  }, []);

  const showUnsupportedShare = useCallback(() => {
    Alert.alert('아직 준비 중이에요', '올리브영 상품 공유는 추후 지원할 예정이에요.');
  }, []);

  const externalEntryOptions = useMemo(
    () => ({
      onNavigate: navigate,
      onUnsupportedShare: showUnsupportedShare,
      webBaseUrl,
    }),
    [navigate, showUnsupportedShare, webBaseUrl],
  );
  useExternalEntry(externalEntryOptions);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack.current) {
        return false;
      }
      webViewRef.current?.goBack();
      return true;
    });

    return () => subscription.remove();
  }, []);

  const handleNavigationChange = useCallback((state: WebViewNavigation) => {
    canGoBack.current = state.canGoBack;
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: Readonly<{ url: string }>) => {
      if (request.url === 'about:blank') {
        return true;
      }

      try {
        const requestedUrl = new URL(request.url);
        if (requestedUrl.origin === webOrigin) {
          return true;
        }
      } catch {
        // Non-web schemes are delegated to the operating system below.
      }

      void Linking.openURL(request.url).catch(() => {
        Alert.alert('링크를 열 수 없어요', '연결된 앱 또는 올바른 주소인지 확인해 주세요.');
      });
      return false;
    },
    [webOrigin],
  );

  const retry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setNavigation((current) => ({ ...current, key: current.key + 1 }));
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <WebView
        key={navigation.key}
        ref={webViewRef}
        allowsBackForwardNavigationGestures
        javaScriptCanOpenWindowsAutomatically={false}
        mixedContentMode='never'
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onHttpError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onLoadStart={() => {
          setHasError(false);
          setIsLoading(true);
        }}
        onNavigationStateChange={handleNavigationChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        originWhitelist={[`${webOrigin}/*`]}
        setSupportMultipleWindows={false}
        sharedCookiesEnabled
        source={{ uri: navigation.url }}
        style={styles.webView}
      />

      {isLoading && !hasError ? (
        <View pointerEvents='none' style={styles.overlay}>
          <ActivityIndicator color='#191919' size='large' />
        </View>
      ) : null}

      {hasError ? (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>페이지를 불러오지 못했어요</Text>
          <Text style={styles.errorBody}>네트워크와 웹 클라이언트 주소를 확인한 뒤 다시 시도해 주세요.</Text>
          <Pressable accessibilityRole='button' onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryLabel}>다시 시도</Text>
          </Pressable>
        </View>
      ) : null}
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
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    color: '#191919',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBody: {
    color: '#5f6368',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#191919',
  },
  retryLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
