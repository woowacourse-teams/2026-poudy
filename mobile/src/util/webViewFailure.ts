import { Platform } from 'react-native';

import type { WebViewErrorDetail, WebViewFailure } from '@/types/webView';

const IOS_FAILURES: Record<number, WebViewFailure> = {
  [-1001]: 'timeout',
  [-1003]: 'address',
  [-1004]: 'address',
  [-1009]: 'offline',
};

const ANDROID_FAILURES: Record<number, WebViewFailure> = {
  [-2]: 'address',
  [-6]: 'address',
  [-8]: 'timeout',
};

export const failureOf = ({ code }: WebViewErrorDetail): WebViewFailure => {
  const failures = Platform.OS === 'ios' ? IOS_FAILURES : ANDROID_FAILURES;

  return failures[code] ?? 'unknown';
};
