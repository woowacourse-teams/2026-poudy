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

export const WEBVIEW_INIT_SCRIPT = appInfo
  ? `
(() => {
  window.__POUDY_APP__ = ${JSON.stringify(appInfo)};
  window.__POUDY_WEB_SCROLL_INDICATOR__ = true;

  const lockViewport = () => {
    const viewport = document.querySelector('meta[name="viewport"]');

    if (!viewport) {
      return;
    }

    const content = viewport.getAttribute('content') ?? '';
    const settings = content
      .split(',')
      .map((setting) => setting.trim())
      .filter((setting) => setting && !setting.startsWith('maximum-scale') && !setting.startsWith('user-scalable'));
    const locked = [...settings, 'maximum-scale=1', 'user-scalable=no'].join(', ');

    if (content !== locked) {
      viewport.setAttribute('content', locked);
    }
  };

  const lockTouchAction = () => {
    const root = document.documentElement;

    if (root && root.style.touchAction !== 'pan-x pan-y') {
      root.style.touchAction = 'pan-x pan-y';
    }
  };

  const lockZoom = () => {
    lockTouchAction();
    lockViewport();
  };

  document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false });

  new MutationObserver(lockZoom).observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['content', 'style'],
  });

  lockZoom();
})();
true;
`.trim()
  : undefined;
