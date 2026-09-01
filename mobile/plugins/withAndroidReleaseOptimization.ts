import { type ConfigPlugin, withAppBuildGradle, withGradleProperties } from 'expo/config-plugins';

const DEFAULT_PROGUARD_FILE = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZED_PROGUARD_FILE = 'getDefaultProguardFile("proguard-android-optimize.txt")';
const OPTIMIZED_RESOURCE_SHRINKING_PROPERTY = 'android.r8.optimizedResourceShrinking';

const withOptimizedProguardFile: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (modConfig) => {
    const { contents } = modConfig.modResults;

    if (contents.includes(OPTIMIZED_PROGUARD_FILE)) {
      return modConfig;
    }

    if (!contents.includes(DEFAULT_PROGUARD_FILE)) {
      throw new Error('Android release ProGuard 설정을 찾을 수 없습니다.');
    }

    modConfig.modResults.contents = contents.replace(DEFAULT_PROGUARD_FILE, OPTIMIZED_PROGUARD_FILE);

    return modConfig;
  });

const withOptimizedResourceShrinking: ConfigPlugin = (config) =>
  withGradleProperties(config, (modConfig) => {
    const property = modConfig.modResults.find(
      (item) => item.type === 'property' && item.key === OPTIMIZED_RESOURCE_SHRINKING_PROPERTY,
    );

    if (property?.type === 'property') {
      property.value = 'true';
    } else {
      modConfig.modResults.push({
        type: 'property',
        key: OPTIMIZED_RESOURCE_SHRINKING_PROPERTY,
        value: 'true',
      });
    }

    return modConfig;
  });

const withAndroidReleaseOptimization: ConfigPlugin = (config) =>
  withOptimizedResourceShrinking(withOptimizedProguardFile(config));

export default withAndroidReleaseOptimization;
