import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n, { LANGUAGES, type LanguageCode } from '../i18n';

interface LanguageState {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: (i18n.language as LanguageCode) || 'en',
      setLanguage: (code: LanguageCode) => {
        i18n.changeLanguage(code);
        set({ language: code });
      },
    }),
    {
      name: 'language',
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);

export { LANGUAGES };
export type { LanguageCode };
