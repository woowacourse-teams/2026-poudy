import { useCallback } from 'react';
import { Alert, StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import WebAppShell from '@/components/WebAppShell';
import { useExternalEntry } from '@/hooks/useExternalEntry';
import { useQuickActions } from '@/hooks/useQuickActions';
import { useWebViewNavigation } from '@/hooks/useWebViewNavigation';

const serviceBaseUrl = process.env.EXPO_PUBLIC_SERVICE_URL!;

export default function RootApp() {
  const navigation = useWebViewNavigation(serviceBaseUrl);

  // 공유한 내용에 열 만한 것이 없는 경우다. 제품을 찾지 못한 경우는 웹이 안내한다.
  const showUnsupportedShare = useCallback(() => {
    Alert.alert('아직 준비 중이에요', '공유한 내용에서 제품을 찾지 못했어요.');
  }, []);

  useExternalEntry({
    onNavigate: navigation.navigate,
    onUnsupportedShare: showUnsupportedShare,
    serviceBaseUrl,
  });

  useQuickActions({ onNavigate: navigation.navigate, serviceBaseUrl });

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar barStyle='dark-content' />
      <WebAppShell serviceBaseUrl={serviceBaseUrl} navigation={navigation} />
    </SafeAreaProvider>
  );
}
