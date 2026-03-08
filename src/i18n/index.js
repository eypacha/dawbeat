import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'
const messages = {
  en,
  es,
}

const getDefaultLocale = () => {
  const supportedLocales = ['es', 'en']
  
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && supportedLocales.includes(savedLocale)) {
    return savedLocale
  }
  
  const browserLocale = navigator.language || navigator.languages[0]
  
  const languageCode = browserLocale.split('-')[0]
  
  if (supportedLocales.includes(languageCode)) {
    return languageCode
  }
  
  if (navigator.languages) {
    for (const lang of navigator.languages) {
      const code = lang.split('-')[0]
      if (supportedLocales.includes(code)) {
        return code
      }
    }
  }
  
  return 'en'
}

const i18n = createI18n({
  legacy: false, 
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages
})

export default i18n
