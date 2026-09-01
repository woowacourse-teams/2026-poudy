import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';

export type WebViewFailure = 'offline' | 'address' | 'timeout' | 'server' | 'unknown';

export interface HardwareBackOptions {
  readonly onNavigate: (url: string) => void;
  readonly serviceBaseUrl: string;
  readonly sourceKey: number;
  readonly sourceUrl: string;
  readonly webViewRef: RefObject<WebView | null>;
}

export interface WebViewBackState {
  readonly canGoBack: boolean;
  readonly url: string;
}

export interface WebViewErrorDetail {
  readonly code: number;
}

export interface WebViewErrorEvent {
  readonly nativeEvent: WebViewErrorDetail;
}

export interface WebViewFailureMessage {
  readonly body: string;
  readonly title: string;
}

export interface WebViewNavigation {
  readonly fail: (reason: WebViewFailure) => void;
  readonly failure: WebViewFailure | null;
  readonly handleLoad: () => void;
  readonly handleLoadEnd: () => void;
  readonly handleUrlChange: (url: string) => void;
  readonly isLoading: boolean;
  readonly key: number;
  readonly navigate: (url: string) => void;
  readonly reload: () => void;
  readonly url: string;
}

export interface WebViewNavigationRequest {
  readonly url: string;
}

export interface WebViewSource {
  readonly key: number;
  readonly url: string;
}
