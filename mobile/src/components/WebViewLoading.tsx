import { StyleSheet, View } from 'react-native';

import LoadingIndicator from '@/components/LoadingIndicator';

interface WebViewLoadingProps {
  readonly continuesFromSplash?: boolean;
}

export default function WebViewLoading({ continuesFromSplash = false }: WebViewLoadingProps) {
  return (
    <View pointerEvents='none' style={styles.overlay}>
      <LoadingIndicator continuesFromSplash={continuesFromSplash} />
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
