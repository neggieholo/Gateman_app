const { withInfoPlist } = require('@expo/config-plugins');

module.exports = function withFirebaseFix(config) {
  return withInfoPlist(config, (config) => {
    config.modResults['FirebaseAppDelegateProxyEnabled'] = false;
    return config;
  });
};