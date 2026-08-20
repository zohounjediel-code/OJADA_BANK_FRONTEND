import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clientService } from '../services/api';

const LANGUAGES = [
  { code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', short: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'Español', short: 'ES', flag: '🇪🇸' },
];

// Usage : <LanguageSwitcher /> — à placer par ex. dans le header, la page de connexion, ou le profil
// Prop "dark" : à utiliser sur fond sombre (ex: navbar bleu marine) pour un bon contraste
export default function LanguageSwitcher({ style = {}, dark = false }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleChange = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
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
    <div ref={ref} style={style} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors sm:gap-1.5 sm:px-2.5',
          dark
            ? 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
            : 'border-navy/10 bg-white text-navy/70 hover:bg-cream-2',
        ].join(' ')}
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.short}</span>
        <i className={`ti ti-chevron-down text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+6px)] z-[200] w-40 overflow-hidden rounded-lg border border-navy/10 bg-white py-1 shadow-xl"
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === current.code}
              onClick={() => handleChange(l.code)}
              className={[
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors',
                l.code === current.code ? 'bg-cream-2 font-semibold text-navy' : 'text-navy/70 hover:bg-cream-2',
              ].join(' ')}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span>{l.label}</span>
              {l.code === current.code && <i className="ti ti-check ml-auto text-gold-dark" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
