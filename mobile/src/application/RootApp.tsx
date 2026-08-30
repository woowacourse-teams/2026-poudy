import { useCallback } from 'react';
import { Alert, StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import WebAppShell from '@/components/WebAppShell';
import { useExternalEntry } from '@/hooks/useExternalEntry';
import { useQuickActions } from '@/hooks/useQuickActions';
import { useWebViewNavigation } from '@/hooks/useWebViewNavigation';
import type { ShareFailure } from '@/types/externalEntry';
import { shareFailureMessageOf } from '@/util/shareFailure';

const webBaseUrl = process.env.EXPO_PUBLIC_WEB_URL!;
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL!;

export default function RootApp() {
  const navigation = useWebViewNavigation(webBaseUrl);

  const showUnsupportedShare = useCallback(() => {
    Alert.alert('아직 준비 중이에요', '공유한 내용에서 제품을 찾지 못했어요.');
  }, []);

  const showShareFailure = useCallback((reason: ShareFailure) => {
    const message = shareFailureMessageOf(reason);

    Alert.alert(message.title, message.body);
  }, []);

  useExternalEntry({
    apiBaseUrl,
    onNavigate: navigation.navigate,
    onShareFailure: showShareFailure,
    onUnsupportedShare: showUnsupportedShare,
    webBaseUrl,
  });

  useQuickActions({ onNavigate: navigation.navigate, webBaseUrl });

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar barStyle='dark-content' />
      <WebAppShell webBaseUrl={webBaseUrl} navigation={navigation} />
    </SafeAreaProvider>
  );
}
