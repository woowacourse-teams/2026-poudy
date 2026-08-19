const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const commonRoot = path.resolve(projectRoot, '..', 'common');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [commonRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@poudy/api': commonRoot,
};

module.exports = config;
