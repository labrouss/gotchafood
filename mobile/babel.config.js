module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
          safe: false,
          allowUndefined: true,
        },
      ],
      // NOTE: "react-native-reanimated/plugin" has been intentionally removed.
      // Reanimated 4.x (required by SDK 54) handles its own Babel transform
      // via babel-preset-expo automatically. Adding the plugin manually causes
      // a red-screen crash: "[runtime not ready]: Cannot read property 'create'"
    ],
  };
};
