import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WebViewFailure, WebViewFailureMessage } from '@/types/webView';

interface WebViewErrorProps {
  readonly reason: WebViewFailure;
  readonly onRetry: () => void;
}

const MESSAGES: Record<WebViewFailure, WebViewFailureMessage> = {
  offline: {
    title: '인터넷에 연결되어 있지 않아요',
    body: 'Wi-Fi 나 데이터가 켜져 있는지 확인한 뒤 다시 시도해 주세요.',
  },
  address: {
    title: '주소를 찾을 수 없어요',
    body: '연결할 주소가 올바르지 않아요. 네트워크는 연결되어 있어요.',
  },
  timeout: {
    title: '연결이 원활하지 않아요',
    body: '네트워크가 불안정하거나 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.',
  },
  server: {
    title: '서버가 응답하지 못했어요',
    body: '잠시 후 다시 시도해 주세요. 계속되면 잠시 뒤에 열어 주세요.',
  },
  unknown: {
    title: '페이지를 불러오지 못했어요',
    body: '인터넷 연결이나 주소를 확인한 뒤 다시 시도해 주세요.',
  },
};

export default function WebViewError({ reason, onRetry }: WebViewErrorProps) {
  const message = MESSAGES[reason];

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.body}>{message.body}</Text>
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
