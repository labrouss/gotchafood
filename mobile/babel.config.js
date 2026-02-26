module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        { unstable_transformImportMeta: true },
      ],
    ],
    // react-native-dotenv intentionally REMOVED.
    // It is officially incompatible with expo-router (SDK 51+) and overwrites
    // expo-router's internal env vars, causing the "Welcome to Expo" screen.
    // API URL is read via process.env.EXPO_PUBLIC_API_URL instead.
  };
};
