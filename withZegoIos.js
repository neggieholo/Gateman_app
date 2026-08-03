// const { withDangerousMod } = require('@expo/config-plugins');

// module.exports = function withZegoIos(config) {
//   return withDangerousMod(config, [
//     'ios',
//     async (config) => {
//       const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
//       let contents = fs.readFileSync(podfile, 'utf8');
//       if (!contents.includes("pod 'ZegoZPNs'")) {
//         contents = contents.replace(/target '.*' do/, `target 'YourProjectName' do\n  pod 'ZegoZPNs', '2.8.0'`);
//         fs.writeFileSync(podfile, contents);
//       }
//       return config;
//     },
//   ]);
// };