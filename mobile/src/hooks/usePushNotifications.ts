import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';

import type { PushNotificationOptions, PushTokenResult } from '@/types/pushNotification';
import {
  notificationUrlOf,
  readPushToken,
  requestPushPermission,
  showNotificationsInForeground,
} from '@/util/pushNotification';

export const usePushNotifications = ({ onNavigate, serviceBaseUrl }: PushNotificationOptions) => {
  const permissionRef = useRef<Promise<boolean> | null>(null);
  const handledResponseRef = useRef<string | null>(null);

  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    showNotificationsInForeground();
    permissionRef.current = requestPushPermission();
  }, []);

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }

    const identifier = response.notification.request.identifier;
    if (handledResponseRef.current === identifier) {
      return;
    }
    handledResponseRef.current = identifier;

    const targetUrl = notificationUrlOf(response, serviceBaseUrl);
    if (targetUrl) {
      onNavigate(targetUrl);
    }
  }, [onNavigate, response, serviceBaseUrl]);

  return useCallback(async (): Promise<PushTokenResult> => {
    await permissionRef.current;
    return readPushToken();
  }, []);
};
