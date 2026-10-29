// Release builds set APP_VERSION from the git tag (v1.2.3 -> 1.2.3). Android's
// versionCode must increase for an APK to install over the previous one, so it's
// derived from the version: 1.2.3 -> 10203.
//
// WEB_BASE_URL serves the web build from a subpath, like /Valo-Store-Tracker on GitHub Pages.
module.exports = ({ config }) => {
  const version = process.env.APP_VERSION;
  const plugins = [...(config.plugins ?? []), './plugins/withReleaseSigning'];
  const baseUrl = process.env.WEB_BASE_URL;
  if (baseUrl) config = { ...config, experiments: { ...config.experiments, baseUrl } };
  if (!version) return { ...config, plugins };

  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`APP_VERSION must look like 1.2.3, got "${version}"`);
  const [major, minor, patch] = match.slice(1).map(Number);

  return {
    ...config,
    plugins,
    version,
    android: { ...config.android, versionCode: major * 10000 + minor * 100 + patch },
  };
};
