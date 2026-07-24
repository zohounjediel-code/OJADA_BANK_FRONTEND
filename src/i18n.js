// ─── CONFIGURATION i18next (FR / EN / DE / ES) ────────────────────
// À importer une seule fois, tout en haut de votre point d'entrée
// (index.js), AVANT le rendu de <App/> :
//
//   import './i18n';
//
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';

i18n
  .use(LanguageDetector)   // détecte la langue du navigateur / choix précédent en localStorage
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      de: { translation: de },
      es: { translation: es },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'de', 'es'],
    interpolation: { escapeValue: false }, // React échappe déjà le HTML

    detection: {
      // Ordre de détection : choix explicite déjà enregistré > langue du navigateur
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ojada_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
