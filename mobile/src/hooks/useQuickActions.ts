import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { useCallback, useEffect } from 'react';

import { getQuickActionItems, getQuickActionUrl } from '@/util/quickAction';

interface QuickActionOptions {
  readonly onNavigate: (url: string) => void;
  readonly webBaseUrl: string;
}

export const useQuickActions = ({ onNavigate, webBaseUrl }: QuickActionOptions) => {
  const handleQuickAction = useCallback(
    (action: QuickActions.Action) => {
      const targetUrl = getQuickActionUrl(action.id, webBaseUrl);
      if (targetUrl) {
        onNavigate(targetUrl);
      }
    },
    [onNavigate, webBaseUrl],
  );

  useEffect(() => {
    void QuickActions.setItems(getQuickActionItems()).catch(() => undefined);
  }, []);

  useQuickActionCallback(handleQuickAction);
};
