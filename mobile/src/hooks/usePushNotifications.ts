import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import type { PushNotificationOptions } from '@/types/pushNotification';
import { notificationUrlOf, prepareNotificationChannel, showNotificationsInForeground } from '@/util/pushNotification';

export const usePushNotifications = ({ onNavigate, serviceBaseUrl }: PushNotificationOptions) => {
  const handledResponseRef = useRef<string | null>(null);

  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    showNotificationsInForeground();
    prepareNotificationChannel().catch(() => undefined);
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
};
