import { StyleSheet, View } from 'react-native';

import LoadingIndicator from '@/components/LoadingIndicator';

interface WebViewLoadingProps {
  readonly onInitialFoldComplete?: () => void;
  readonly isRunning?: boolean;
}

export default function WebViewLoading({ isRunning = true, onInitialFoldComplete }: WebViewLoadingProps) {
  return (
    <View pointerEvents='none' style={styles.overlay}>
      <LoadingIndicator isRunning={isRunning} onInitialFoldComplete={onInitialFoldComplete} />
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
