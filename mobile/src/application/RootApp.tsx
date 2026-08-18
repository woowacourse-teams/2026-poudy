import { StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { WebAppShell } from '@/components/WebAppShell';

const webBaseUrl = process.env.EXPO_PUBLIC_WEB_URL!;

export function RootApp() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar barStyle='dark-content' />
      <WebAppShell webBaseUrl={webBaseUrl} />
    </SafeAreaProvider>
  );
}
