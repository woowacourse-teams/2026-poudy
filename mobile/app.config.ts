import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_NAME = 'Poudy';
const APP_SLUG = 'poudy';
const DEFAULT_BUNDLE_IDENTIFIER = 'com.poudy.app';
const DEFAULT_APP_VERSION = '0.1.0';
const EAS_ACCOUNT = 'poudys-team';
const EAS_PROJECT_ID = '25e0967e-a114-4253-ad7a-a39063fce314';
const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL;
const APP_VERSION = process.env.POUDY_APP_VERSION;

if (!WEB_BASE_URL) {
  throw new Error('EXPO_PUBLIC_WEB_URL is required.');
}

if (!['http:', 'https:'].includes(new URL(WEB_BASE_URL).protocol)) {
  throw new Error('EXPO_PUBLIC_WEB_URL must use http or https.');
}

if (process.env.EAS_BUILD_PROFILE === 'production' && !APP_VERSION) {
  throw new Error('POUDY_APP_VERSION is required for production builds.');
}

if (APP_VERSION && !/^\d+\.\d+\.\d+$/.test(APP_VERSION)) {
  throw new Error('POUDY_APP_VERSION must be x.y.z.');
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const bundleIdentifier = process.env.POUDY_BUNDLE_IDENTIFIER ?? DEFAULT_BUNDLE_IDENTIFIER;
  return {
    ...config,
    name: APP_NAME,
    slug: APP_SLUG,
    owner: EAS_ACCOUNT,
    version: APP_VERSION ?? DEFAULT_APP_VERSION,
    icon: './assets/poudy-mark.png',
    orientation: 'portrait',
    scheme: APP_SLUG,
    userInterfaceStyle: 'light',
    ios: {
      bundleIdentifier,
      supportsTablet: false,
    },
    android: {
      // 루트 icon 은 iOS 가 쓴다. 안드로이드는 여백을 둔 그림이라야 잘리지 않는다.
      icon: './assets/poudy-adaptive-icon.png',
      adaptiveIcon: {
        backgroundColor: '#ffffff',
        foregroundImage: './assets/poudy-adaptive-icon.png',
      },
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
      package: bundleIdentifier,
    },
    plugins: [
      './plugins/withQuickActionIcons',
      [
        'expo-dev-client',
        {
          launchMode: 'most-recent',
          skipOnboarding: true,
          showMenuAtLaunch: false,
          toolsButton: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-sharing',
        {
          ios: {
            enabled: true,
            extensionBundleIdentifier: `${bundleIdentifier}.ShareExtension`,
            appGroupId: `group.${bundleIdentifier}`,
            activationRule: {
              supportsText: true,
              supportsWebPageWithMaxCount: 1,
              supportsWebUrlWithMaxCount: 1,
            },
          },
          android: {
            enabled: true,
            singleShareMimeTypes: ['text/*'],
            multipleShareMimeTypes: [],
          },
        },
      ],
    ],
    extra: {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        projectId: EAS_PROJECT_ID,
      },
    },
  };
};
