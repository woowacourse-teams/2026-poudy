import { useCallback } from 'react';
import type { WebViewMessageEvent } from 'react-native-webview';

import { playSelectionHaptic } from '@/util/haptic';
import { shareText } from '@/util/share';

const HAPTIC_SELECTION_MESSAGE = 'poudy:haptic:selection';

const SHARE_MESSAGE_PREFIX = 'poudy:share:';

export const useWebViewBridge = () =>
  useCallback((event: WebViewMessageEvent) => {
    const { data } = event.nativeEvent;

    if (data === HAPTIC_SELECTION_MESSAGE) {
      playSelectionHaptic();
      return;
    }

    if (data.startsWith(SHARE_MESSAGE_PREFIX)) {
      void shareText(data.slice(SHARE_MESSAGE_PREFIX.length)).catch(() => undefined);
    }
  }, []);
