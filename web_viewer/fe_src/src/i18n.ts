import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import vi from './locales/vi.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    }
  });

// Ensure detected language is two characters
const normalizeLanguage = (lng: string) => lng.substring(0, 2);

const currentLang = i18n.language;
const normalizedLang = currentLang ? normalizeLanguage(currentLang) : currentLang;
if (currentLang && currentLang !== normalizedLang) {
  i18n.changeLanguage(normalizedLang);
}

i18n.on('languageChanged', (lng: string) => {
  const newLng = normalizeLanguage(lng);
  if (newLng !== lng) {
    i18n.changeLanguage(newLng);
  }
});

export default i18n;
