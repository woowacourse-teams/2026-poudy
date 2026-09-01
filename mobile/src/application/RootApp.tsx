import { StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import WebAppShell from '@/components/WebAppShell';

export default function RootApp() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar barStyle='dark-content' />
      <WebAppShell />
    </SafeAreaProvider>
  );
}
