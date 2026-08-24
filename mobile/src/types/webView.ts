import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';

export type WebViewFailure = 'offline' | 'address' | 'timeout' | 'server' | 'unknown';

export interface WebViewErrorDetail {
  readonly code: number;
}

export interface WebViewErrorEvent {
  readonly nativeEvent: WebViewErrorDetail;
}

export interface WebViewNavigation {
  readonly key: number;
  readonly url: string;
  readonly isLoading: boolean;
  readonly failure: WebViewFailure | null;
  readonly navigate: (url: string) => void;
  readonly reload: () => void;
  readonly handleLoad: () => void;
  readonly handleLoadEnd: () => void;
  readonly fail: (reason: WebViewFailure) => void;
}

export interface HardwareBackOptions {
  readonly onNavigate: (url: string) => void;
  readonly webBaseUrl: string;
  readonly webViewRef: RefObject<WebView | null>;
}
