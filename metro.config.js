const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// See shims/TopicSubscriptionModule.js
const topicShim = path.resolve(__dirname, 'shims/TopicSubscriptionModule.js');
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === './TopicSubscriptionModule' &&
    context.originModulePath.includes(`${path.sep}expo-notifications${path.sep}`)
  ) {
    return { type: 'sourceFile', filePath: topicShim };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
