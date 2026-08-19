import { useCallback, useMemo } from 'react';
import { Alert, StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import WebAppShell from '@/components/WebAppShell';
import { useExternalEntry } from '@/hooks/useExternalEntry';
import { useWebViewNavigation } from '@/hooks/useWebViewNavigation';

const webBaseUrl = process.env.EXPO_PUBLIC_WEB_URL!;

export default function RootApp() {
  const navigation = useWebViewNavigation(webBaseUrl);

  const showUnsupportedShare = useCallback(() => {
    Alert.alert('아직 준비 중이에요', '공유한 내용에서 제품을 찾지 못했어요.');
  }, []);

  const externalEntryOptions = useMemo(
    () => ({
      onNavigate: navigation.navigate,
      onUnsupportedShare: showUnsupportedShare,
      webBaseUrl,
    }),
    [navigation.navigate, showUnsupportedShare],
  );
  useExternalEntry(externalEntryOptions);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar barStyle='dark-content' />
      <WebAppShell webBaseUrl={webBaseUrl} navigation={navigation} />
    </SafeAreaProvider>
  );
}
