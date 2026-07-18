import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import zh from './zh.json'

void i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  lng: 'zh',
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
})

export default i18n
