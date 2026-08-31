import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { useCallback, useEffect } from 'react';

import type { QuickActionOptions } from '@/types/quickAction';
import { getQuickActionItems, getQuickActionUrl } from '@/util/quickAction';

export const useQuickActions = ({ onNavigate, serviceBaseUrl }: QuickActionOptions) => {
  const handleQuickAction = useCallback(
    (action: QuickActions.Action) => {
      const targetUrl = getQuickActionUrl(action.id, serviceBaseUrl);
      if (targetUrl) {
        onNavigate(targetUrl);
      }
    },
    [onNavigate, serviceBaseUrl],
  );

  useEffect(() => {
    void QuickActions.setItems(getQuickActionItems()).catch(() => undefined);
  }, []);

  useQuickActionCallback(handleQuickAction);
};
