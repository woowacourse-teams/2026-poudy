import * as fs from 'node:fs';
import * as path from 'node:path';

import { type ConfigPlugin, withDangerousMod } from 'expo/config-plugins';

/**
 * Android 12의 animated-vector 스플래시 아이콘은 별도 SurfaceView를 만들어 인계 시
 * 깜빡임을 일으킨다. 시작 창은 흰 배경만 그리고 전체 애니메이션은 RN에서 재생한다.
 */
export const SPLASH_ANIMATION_DURATION = 0;

const BLANK_SPLASH_ICON = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="1dp"
    android:height="1dp"
    android:viewportWidth="1"
    android:viewportHeight="1">
  <path
      android:fillColor="#00ffffff"
      android:pathData="M0,0 L1,0 L1,1 L0,1 Z" />
</vector>
`;

const writeBlankIcon = (resourceRoot: string, directory: string) => {
  const targetDirectory = path.join(resourceRoot, directory);
  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.writeFileSync(path.join(targetDirectory, 'splashscreen_loader.xml'), BLANK_SPLASH_ICON);
};

const withAndroidLoadingSplash: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      const resourceRoot = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');

      writeBlankIcon(resourceRoot, 'drawable');
      writeBlankIcon(resourceRoot, 'drawable-v31');
      return modConfig;
    },
  ]);

export default withAndroidLoadingSplash;
