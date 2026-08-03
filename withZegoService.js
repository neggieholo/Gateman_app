const { withAndroidManifest, withAppBuildGradle, withPlugins } = require('@expo/config-plugins');

module.exports = function withZego(config) {
  // 1. Inject Gradle Dependencies
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents += `
dependencies {
    implementation 'im.zego:zpns-android:2.8.0'
    implementation 'im.zego:zpns-fcm:2.8.0'
}
`;
    return config;
  });

  // 2. Inject Manifest Service
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application.service = application.service || [];
    application.service.push({
      $: { 
        'android:name': 'im.zego.zpns.fcm.ZegoFcmMessageService', 
        'android:exported': 'false' 
      },
      'intent-filter': [{ action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }] }]
    });
    return config;
  });

  return config;
};