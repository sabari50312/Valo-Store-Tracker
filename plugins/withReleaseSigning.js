// Signs release builds with our own keystore when CI provides one through env
// vars, so every APK has the same signature and installs over the previous one.
// Without the env vars (local builds) release falls back to the debug key, as
// the Expo template does by default.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// withReleaseSigning';

const RELEASE_CONFIG = `    signingConfigs {
        ${MARKER}
        release {
            if (System.getenv('ANDROID_KEYSTORE_FILE')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_FILE'))
                storeType 'pkcs12'
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, cfg => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    // Point the release build type at our config (only when the keystore is present).
    const releaseBuildType = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseBuildType.test(gradle)) {
      throw new Error('withReleaseSigning: release signingConfig not found in app/build.gradle');
    }
    gradle = gradle.replace(
      releaseBuildType,
      "$1signingConfig System.getenv('ANDROID_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );

    if (!gradle.includes('    signingConfigs {\n')) {
      throw new Error('withReleaseSigning: signingConfigs block not found in app/build.gradle');
    }
    gradle = gradle.replace('    signingConfigs {\n', RELEASE_CONFIG);

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
