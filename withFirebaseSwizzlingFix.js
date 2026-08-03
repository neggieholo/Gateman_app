const { withInfoPlist } = require('@expo/config-plugins');

module.exports = function withFirebaseSwizzlingFix(config) {
  return withInfoPlist(config, (config) => {
    // 1. Enforce the swizzling block for Zego
    config.modResults.FirebaseAppDelegateProxyEnabled = false;
    
    // 2. Suppress the native Firebase Auth crash loop safely
    config.modResults.FirebaseScreenReportingEnabled = false; 
    
    return config;
  });
};
