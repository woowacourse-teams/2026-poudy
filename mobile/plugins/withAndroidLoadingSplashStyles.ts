import { AndroidConfig, type ConfigPlugin, withAndroidStyles } from 'expo/config-plugins';

import { SPLASH_ANIMATION_DURATION } from './withAndroidLoadingSplash';

const SPLASH_THEME = {
  name: 'Theme.App.SplashScreen',
  parent: 'Theme.SplashScreen',
};

const withSplashStyleValue = (styles: AndroidConfig.Resources.ResourceXML, name: string, value: string) =>
  AndroidConfig.Styles.assignStylesValue(styles, {
    add: true,
    name,
    parent: SPLASH_THEME,
    value,
  });

/** Expo 스플래시가 만든 로고 참조를 네이티브 로더와 애니메이션 시간으로 덮어쓴다. */
const withAndroidLoadingSplashStyles: ConfigPlugin = (config) =>
  withAndroidStyles(config, (modConfig) => {
    const withLoader = withSplashStyleValue(
      modConfig.modResults,
      'windowSplashScreenAnimatedIcon',
      '@drawable/splashscreen_loader',
    );
    modConfig.modResults = withSplashStyleValue(
      withLoader,
      'windowSplashScreenAnimationDuration',
      String(SPLASH_ANIMATION_DURATION),
    );
    return modConfig;
  });

export default withAndroidLoadingSplashStyles;
