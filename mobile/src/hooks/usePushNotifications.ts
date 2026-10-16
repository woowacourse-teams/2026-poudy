import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { PushNotificationOptions, PushTokenAccess, PushTokenResult } from '@/types/pushNotification';
import {
  notificationUrlOf,
  readPushToken,
  requestPushToken,
  showNotificationsInForeground,
} from '@/util/pushNotification';

export const usePushNotifications = ({ onNavigate, serviceBaseUrl }: PushNotificationOptions): PushTokenAccess => {
  const launchRequestRef = useRef<Promise<PushTokenResult> | null>(null);
  const handledResponseRef = useRef<string | null>(null);

  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    showNotificationsInForeground();
    launchRequestRef.current = requestPushToken();
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

  const read = useCallback(async () => {
    await launchRequestRef.current;
    return readPushToken();
  }, []);

  const request = useCallback(async () => {
    await launchRequestRef.current;
    return requestPushToken();
  }, []);

  return useMemo(() => ({ read, request }), [read, request]);
};
