import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushTokenResult } from '@/types/pushNotification';
import { getNotificationUrl } from '@/util/entryUrl';

export const PUSH_TOKEN_MESSAGE = 'poudy:push-token';
const PUSH_TOKEN_EVENT = 'poudy:push-token';
const DEFAULT_CHANNEL_ID = 'default';
const DEFAULT_CHANNEL_NAME = '알림';
const PROJECT_ID: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;

const FOREGROUND_BEHAVIOR: Notifications.NotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
};

export const showNotificationsInForeground = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => FOREGROUND_BEHAVIOR,
  });
};

const prepareChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: DEFAULT_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

const askPermission = async (): Promise<boolean> => {
  await prepareChannel();
  const current = await Notifications.getPermissionsAsync();

  if (current.granted || !current.canAskAgain) {
    return current.granted;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

export const requestPushPermission = (): Promise<boolean> => askPermission().catch(() => false);

export const readPushToken = async (): Promise<PushTokenResult> => {
  try {
    const permission = await Notifications.getPermissionsAsync();

    if (!permission.granted) {
      return { status: 'denied' };
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return { status: 'granted', token: data };
  } catch {
    return { status: 'failed' };
  }
};

export const pushTokenResultScript = (result: PushTokenResult): string =>
  `window.dispatchEvent(new CustomEvent(${JSON.stringify(PUSH_TOKEN_EVENT)}, { detail: ${JSON.stringify(result)} }));
true;`;

export const notificationUrlOf = (
  response: Notifications.NotificationResponse,
  serviceBaseUrl: string,
): string | null => {
  const url = response.notification.request.content.data?.url;

  if (typeof url !== 'string') {
    return null;
  }

  return getNotificationUrl(url, serviceBaseUrl);
};
