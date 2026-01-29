import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationKO from './locales/ko.json';
import translationEN from './locales/en.json';
import translationJA from './locales/ja.json';
import translationES from './locales/es.json';

const resources = {
  ko: {
    translation: translationKO
  },
  en: {
    translation: translationEN
  },
  ja: {
    translation: translationJA
  },
  es: {
    translation: translationES
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // 기본 언어
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
