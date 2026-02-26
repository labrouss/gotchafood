import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { LANGUAGES, DEFAULT_LANGUAGE, type LanguageCode } from '../i18n';

interface LanguageState {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (code: LanguageCode) => {
        i18n.changeLanguage(code);
        set({ language: code });
      },
    }),
    {
      name: 'language',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Apply persisted language once AsyncStorage is ready
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);

export { LANGUAGES };
export type { LanguageCode };
