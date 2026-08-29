import 'tsx/cjs';

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

/** App Links 는 https 로만 검증된다. 로컬 주소를 보는 개발 빌드에서는 걸지 않는다. */
const appLinkHostOf = (webBaseUrl: string) => {
  const web = new URL(webBaseUrl);

  if (web.protocol !== 'https:') {
    return null;
  }

  return web.host;
};

/** 공유한 https 주소를 앱이 받도록 한다. 없으면 브라우저가 연다. */
const androidAppLinksOf = (host: string | null): Pick<NonNullable<ExpoConfig['android']>, 'intentFilters'> => {
  if (!host) {
    return {};
  }

  return {
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [{ scheme: 'https', host }],
      },
    ],
  };
};

const iosAppLinksOf = (host: string | null): Pick<NonNullable<ExpoConfig['ios']>, 'associatedDomains'> => {
  if (!host) {
    return {};
  }

  return { associatedDomains: [`applinks:${host}`] };
};

/** 정식 앱 옆에 나란히 깔았을 때 홈 화면과 공유 시트에서 구분되게 한다. */
const appNameOf = (bundleIdentifier: string) => {
  if (bundleIdentifier === DEFAULT_BUNDLE_IDENTIFIER) {
    return APP_NAME;
  }

  return `${APP_NAME} Dev`;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const bundleIdentifier = process.env.POUDY_BUNDLE_IDENTIFIER ?? DEFAULT_BUNDLE_IDENTIFIER;
  const appLinkHost = appLinkHostOf(WEB_BASE_URL);

  return {
    ...config,
    name: appNameOf(bundleIdentifier),
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
      ...iosAppLinksOf(appLinkHost),
    },
    android: {
      // 없으면 AppCompat 기본색이 스플래시와 첫 화면 사이에 비친다.
      backgroundColor: '#ffffff',
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
      ...androidAppLinksOf(appLinkHost),
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
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
      './plugins/withAndroidLoadingSplashStyles.ts',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
        },
      ],
      './plugins/withAndroidLoadingSplash.ts',
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
