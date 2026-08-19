import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { useCallback, useEffect } from 'react';

import { getQuickActionItems, getQuickActionUrl } from '@/util/quickAction';

interface QuickActionOptions {
  readonly onNavigate: (url: string) => void;
  readonly webBaseUrl: string;
}

export const useQuickActions = ({ onNavigate, webBaseUrl }: QuickActionOptions) => {
  useEffect(() => {
    const register = async () => {
      if (!(await QuickActions.isSupported())) {
        return;
      }

      await QuickActions.setItems(getQuickActionItems());
    };

    void register().catch(() => undefined);
  }, []);

  useQuickActionCallback(
    useCallback(
      (action: QuickActions.Action) => {
        const targetUrl = getQuickActionUrl(action.id, webBaseUrl);
        if (targetUrl) {
          onNavigate(targetUrl);
        }
      },
      [onNavigate, webBaseUrl],
    ),
  );
};
