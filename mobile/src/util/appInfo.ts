import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { AppInfo, AppPlatform } from '@/types/appInfo';

const APP_PLATFORMS: readonly AppPlatform[] = ['ios', 'android'];
const UNKNOWN = 'unknown';
const APP_VERSION = Constants.expoConfig?.version ?? UNKNOWN;

const getAppInfo = (): AppInfo | null => {
  const platform = APP_PLATFORMS.find((candidate) => candidate === Platform.OS);

  if (!platform) {
    return null;
  }

  return {
    is_app: true,
    platform,
    app_version: APP_VERSION,
    os_version: Device.osVersion ?? UNKNOWN,
    device_model: Device.modelName ?? UNKNOWN,
  };
};

const appInfo = getAppInfo();

export const APPLICATION_NAME = `Poudy/${APP_VERSION}`;

export const APP_INFO_SCRIPT = appInfo ? `window.__POUDY_APP__ = ${JSON.stringify(appInfo)}; true;` : undefined;
