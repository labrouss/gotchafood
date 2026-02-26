// Type declarations for Expo's built-in environment variable system.
// Variables prefixed EXPO_PUBLIC_ are injected at build time by Expo CLI.
// See: https://docs.expo.dev/guides/environment-variables/
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
  }
}
