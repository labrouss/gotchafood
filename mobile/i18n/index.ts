// ─────────────────────────────────────────────────────────────────────────────
// i18n — React Native / Expo SDK 54 / Hermes
//
// IMPORTANT NOTES:
//  • compatibilityJSON: 'v3' means i18next uses its OWN plural rules and does
//    NOT call Intl.PluralRules at all — so no polyfill is needed on Hermes.
//  • Do NOT add `import 'intl-pluralrules'` — if that package is missing from
//    node_modules the entire bundle crashes before React mounts, which causes
//    the "Welcome to Expo" fallback screen with no error message.
//  • Synchronous init — i18n must be ready before any component renders.
//    The guard `if (!i18n.isInitialized)` prevents double-init on hot reload.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import el from './locales/el.json';

export const LANGUAGES = [
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        el: { translation: el },
      },
      lng: DEFAULT_LANGUAGE,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v3',   // ← uses built-in plural rules, no Intl API needed
      react: { useSuspense: false },
    });
}

export default i18n;
