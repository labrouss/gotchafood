import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import el from './locales/el.json';

// ── Add new languages here — no other file needs to change ──────────────────
// import de from './locales/de.json';
// import fr from './locales/fr.json';
// import it from './locales/it.json';

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  // { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  // { code: 'fr', label: 'Français', flag: '🇫🇷' },
  // { code: 'it', label: 'Italiano', flag: '🇮🇹' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

const savedLang = localStorage.getItem('language') as LanguageCode | null;
const browserLang = navigator.language.split('-')[0] as LanguageCode;
const defaultLang: LanguageCode =
  savedLang && LANGUAGES.some(l => l.code === savedLang) ? savedLang :
  LANGUAGES.some(l => l.code === browserLang) ? browserLang : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      el: { translation: el },
      // de: { translation: de },
      // fr: { translation: fr },
    },
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
