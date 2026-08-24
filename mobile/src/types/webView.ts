import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';

export interface WebViewNavigation {
  readonly key: number;
  readonly url: string;
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly navigate: (url: string) => void;
  readonly reload: () => void;
  readonly handleLoadEnd: () => void;
  readonly handleFailure: () => void;
}

export interface HardwareBackOptions {
  readonly onNavigate: (url: string) => void;
  readonly webBaseUrl: string;
  readonly webViewRef: RefObject<WebView | null>;
}
