import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';
console.log('Detected locale:', deviceLocale);

i18n
    .use(initReactI18next)
    .init({
        resources: {
            de: { translation: de },
            en: { translation: en },
            es: { translation: es },
        },
        lng: deviceLocale,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });
console.log('i18n language after init:', i18n.language);
console.log('de resource loaded:', i18n.hasResourceBundle('de', 'translation'));
export default i18n;