module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      ['module:react-native-dotenv', {
          moduleName: '@env',
          path: '.env',
          safe: false,
          allowUndefined: true,
      }],
      // REMOVE 'react-native-worklets/plugin'
      'react-native-reanimated/plugin', // Keep only this one, and keep it LAST
    ],
  };
};
