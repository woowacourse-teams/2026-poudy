import { StyleSheet, View } from 'react-native';

import LoadingIndicator from '@/components/LoadingIndicator';

interface WebViewLoadingProps {
  readonly onInitialFoldComplete?: () => void;
  readonly running?: boolean;
}

export default function WebViewLoading({ onInitialFoldComplete, running = true }: WebViewLoadingProps) {
  return (
    <View pointerEvents='none' style={styles.overlay}>
      <LoadingIndicator onInitialFoldComplete={onInitialFoldComplete} running={running} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
