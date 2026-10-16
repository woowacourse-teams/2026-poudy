import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushTokenResult } from '@/types/pushNotification';
import { getNotificationUrl } from '@/util/entryUrl';

export const PUSH_TOKEN_MESSAGE = 'poudy:push-token';
export const PUSH_PERMISSION_MESSAGE = 'poudy:push-permission';
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

export const prepareNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: DEFAULT_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

const tokenResultOf = async (permission: Notifications.NotificationPermissionsStatus): Promise<PushTokenResult> => {
  if (permission.granted) {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return { status: 'granted', token: data };
  }

  if (permission.canAskAgain) {
    return { status: 'prompt' };
  }

  return { status: 'denied' };
};

const askPermission = async (): Promise<Notifications.NotificationPermissionsStatus> => {
  await prepareNotificationChannel();
  const current = await Notifications.getPermissionsAsync();

  if (current.granted || !current.canAskAgain) {
    return current;
  }

  return Notifications.requestPermissionsAsync();
};

const pushTokenResultWith = async (
  permissionOf: () => Promise<Notifications.NotificationPermissionsStatus>,
): Promise<PushTokenResult> => {
  try {
    return await tokenResultOf(await permissionOf());
  } catch {
    return { status: 'failed' };
  }
};

export const readPushToken = (): Promise<PushTokenResult> => pushTokenResultWith(Notifications.getPermissionsAsync);

export const requestPushToken = (): Promise<PushTokenResult> => pushTokenResultWith(askPermission);

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
