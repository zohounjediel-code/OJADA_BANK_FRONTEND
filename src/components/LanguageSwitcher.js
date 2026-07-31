import { useTranslation } from 'react-i18next';
import { clientService } from '../services/api';

const LANGUAGES = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
];

// Usage : <LanguageSwitcher /> — à placer par ex. dans le header, la page de connexion, ou le profil
// Prop "dark" : à utiliser sur fond sombre (ex: navbar bleu marine) pour un bon contraste
export default function LanguageSwitcher({ style = {}, dark = false }) {
  const { i18n } = useTranslation();

  const handleChange = (code) => {
    i18n.changeLanguage(code);
    // Si un compte est connecté, on sauvegarde aussi la préférence côté serveur (preferred_language) :
    // c'est cette valeur qui détermine la langue des emails (asynchrones, envoyés hors de toute session
    // active) et sert de repli pour les notifications si jamais aucun en-tête de langue n'est transmis.
    // Appel silencieux : un échec ici (déconnecté, hors-ligne...) ne doit jamais bloquer le changement
    // de langue visible instantanément dans l'app.
    if (localStorage.getItem('ojada_token')) {
      clientService.updateLanguage(code).catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', gap: 4, ...style }}>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => handleChange(l.code)}
          style={{
            border: 'none',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            background: i18n.language === l.code
              ? (dark ? 'rgba(201,168,76,0.9)' : 'var(--navy, #0a1628)')
              : (dark ? 'rgba(255,255,255,0.08)' : 'transparent'),
            color: i18n.language === l.code
              ? (dark ? 'var(--navy, #0a1628)' : '#fff')
              : (dark ? 'rgba(255,255,255,0.65)' : 'var(--text2, #5F5E5A)'),
            fontFamily: 'var(--sans)',
          }}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}
