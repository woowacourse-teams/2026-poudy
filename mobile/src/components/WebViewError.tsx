import { Pressable, StyleSheet, Text, View } from 'react-native';

interface WebViewErrorProps {
  readonly onRetry: () => void;
}

export default function WebViewError({ onRetry }: WebViewErrorProps) {
  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>페이지를 불러오지 못했어요</Text>
      <Text style={styles.body}>네트워크와 웹 클라이언트 주소를 확인한 뒤 다시 시도해 주세요.</Text>
      <Pressable accessibilityRole='button' onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryLabel}>다시 시도</Text>
      </Pressable>
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
    gap: 12,
    padding: 32,
    backgroundColor: '#ffffff',
  },
  title: {
    color: '#191919',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
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
