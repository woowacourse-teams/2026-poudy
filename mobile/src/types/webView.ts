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
  readonly handleUrlChange: (url: string) => void;
  readonly handleLoad: () => void;
  readonly handleLoadEnd: () => void;
  readonly fail: (reason: WebViewFailure) => void;
}

export interface HardwareBackOptions {
  readonly onNavigate: (url: string) => void;
  /** 바뀌면 WebView 를 다시 만든 것이고, 방문 기록이 비어 있다. */
  readonly sourceKey: number;
  readonly sourceUrl: string;
  readonly webBaseUrl: string;
  readonly webViewRef: RefObject<WebView | null>;
}
