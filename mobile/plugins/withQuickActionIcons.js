const fs = require('node:fs');
const path = require('node:path');

const { withDangerousMod, IOSConfig } = require('expo/config-plugins');

const SOURCE_DIR = path.join('assets', 'quick-actions');
// 가장 큰 밀도에만 둔다. 낮은 밀도는 안드로이드가 줄여 쓴다.
const ANDROID_DRAWABLE_DIR = path.join('app', 'src', 'main', 'res', 'drawable-xxxhdpi');
const ANDROID_KEEP_FILE = path.join('app', 'src', 'main', 'res', 'raw', 'keep.xml');

const readIconNames = (projectRoot) =>
  fs
    .readdirSync(path.join(projectRoot, SOURCE_DIR))
    .filter((entry) => entry.endsWith('.png'))
    .map((entry) => path.basename(entry, '.png'));

const writeAndroidKeepRules = (platformProjectRoot, names) => {
  const target = path.join(platformProjectRoot, ANDROID_KEEP_FILE);
  const keep = names.map((name) => `@drawable/${name}`).join(',');

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(
    target,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="${keep}" />\n`,
  );
};

const copyIcon = (projectRoot, name, targetDir) => {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(path.join(projectRoot, SOURCE_DIR, `${name}.png`), path.join(targetDir, `${name}.png`));
};

const withAndroidQuickActionIcons = (config) =>
  withDangerousMod(config, [
    'android',
    (modConfig) => {
      const { projectRoot, platformProjectRoot } = modConfig.modRequest;
      const names = readIconNames(projectRoot);

      names.forEach((name) => {
        copyIcon(projectRoot, name, path.join(platformProjectRoot, ANDROID_DRAWABLE_DIR));
      });
      writeAndroidKeepRules(platformProjectRoot, names);

      return modConfig;
    },
  ]);

const withIosQuickActionIcons = (config) =>
  withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const { projectRoot, platformProjectRoot } = modConfig.modRequest;
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
      const catalog = path.join(platformProjectRoot, projectName, 'Images.xcassets');

      readIconNames(projectRoot).forEach((name) => {
        const imageset = path.join(catalog, `${name}.imageset`);
        copyIcon(projectRoot, name, imageset);
        // 템플릿이라야 iOS 가 실루엣으로 그린다.
        fs.writeFileSync(
          path.join(imageset, 'Contents.json'),
          `${JSON.stringify(
            {
              images: [{ idiom: 'universal', filename: `${name}.png` }],
              info: { author: 'expo', version: 1 },
              properties: { 'template-rendering-intent': 'template' },
            },
            null,
            2,
          )}\n`,
        );
      });

      return modConfig;
    },
  ]);

/** assets/quick-actions 의 그림을 두 네이티브 프로젝트가 찾을 수 있는 자리로 옮긴다. */
module.exports = (config) => withIosQuickActionIcons(withAndroidQuickActionIcons(config));
