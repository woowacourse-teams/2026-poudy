import { StyleSheet, View } from 'react-native';

import LoadingIndicator from '@/components/LoadingIndicator';

export default function WebViewLoading() {
  return (
    <View pointerEvents='none' style={styles.overlay}>
      <LoadingIndicator />
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
