import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import logo from '../assets/logo.png';

const inputCls = 'w-full h-10 rounded-lg border border-navy/15 bg-white px-3 text-[13px] text-navy outline-none transition-colors focus:border-gold-dark';
const labelCls = 'mb-1.5 block text-[11px] text-navy/50';
const submitCls = 'mt-1.5 h-[42px] w-full rounded-lg bg-navy text-[13px] font-medium text-white transition-opacity disabled:opacity-60';
const linkCls = 'cursor-pointer text-gold-dark';

const getServices = (t) => [
  { icon: 'ti-credit-card', name: t('landing.service1Name'), desc: t('landing.service1Desc') },
  { icon: 'ti-piggy-bank', name: t('landing.service2Name'), desc: t('landing.service2Desc') },
  { icon: 'ti-building', name: t('landing.service3Name'), desc: t('landing.service3Desc') },
  { icon: 'ti-send', name: t('landing.service4Name'), desc: t('landing.service4Desc') },
  { icon: 'ti-chart-line', name: t('landing.service5Name'), desc: t('landing.service5Desc') },
  { icon: 'ti-shield-check', name: t('landing.service6Name'), desc: t('landing.service6Desc') },
];
const getSteps = (t) => [
  { num: '1', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
  { num: '2', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
  { num: '3', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  { num: '4', title: t('landing.step4Title'), desc: t('landing.step4Desc') },
];
const getTestimonials = (t) => [
  { text: t('landing.testimonial1Text'), author: 'Kofi Mensah', role: t('landing.testimonial1Role'), initials: 'KM', color: '#E6F1FB', textColor: '#185FA5' },
  { text: t('landing.testimonial2Text'), author: 'Fatou Ndiaye', role: t('landing.testimonial2Role'), initials: 'FN', color: '#FBEAF0', textColor: '#993556' },
  { text: t('landing.testimonial3Text'), author: 'Aïssatou Diallo', role: t('landing.testimonial3Role'), initials: 'AD', color: '#EAF3DE', textColor: '#3B6D11' },
];

// ─── MODAL CONTENT ────────────────────────────────────────────────
// Un seul formulaire pour client et admin : l'identifiant tapé détermine le compte
// (une adresse email — toujours @gmail.com pour un client — bascule sur la connexion
// client, tout le reste est traité comme un nom d'utilisateur admin).
function LoginForm({ onSuccess, onForgot, onRegister }) {
  const { t } = useTranslation();
  const { loginClient, loginAdmin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const id = identifier.trim();
      const user = id.includes('@')
        ? await loginClient(id, password)
        : await loginAdmin(id, password);
      onSuccess(user);
    } catch (err) {
      setError(err.message || t('auth.err_login_invalid'));
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="font-serif text-[22px] text-navy">{t('auth.loginTitle')}</h3>
      <p className="mb-4 mt-1 text-xs text-navy/50">{t('auth.loginSubtitle')}</p>
      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>}
      <div className="mb-3">
        <label className={labelCls}>{t('auth.identifierLabel')}</label>
        <input className={inputCls} type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={t('auth.identifierPlaceholder')} required autoFocus autoCapitalize="none" autoCorrect="off" />
      </div>
      <div className="mb-3">
        <label className={labelCls}>{t('auth.password')}</label>
        <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
      </div>
      <button className={submitCls} type="submit" disabled={loading}>
        {loading ? t('auth.loggingIn') : t('auth.loginButton')}
      </button>
      <div className="mt-3.5 text-center text-xs text-navy/50">
        <span className={linkCls} onClick={onForgot}>{t('auth.forgotPassword')}</span>
        {' · '}
        <span className={linkCls} onClick={onRegister}>{t('auth.register')}</span>
      </div>
    </form>
  );
}

function RegisterForm({ onSuccess, onLogin }) {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', first_name: '', last_name: '', phone: '', address: '', city: '', postal_code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError(t('auth.passwordMismatch'));
    setLoading(true);
    try {
      const user = await register({
        email: form.email, password: form.password,
        first_name: form.first_name, last_name: form.last_name,
        phone: form.phone, address: form.address,
        city: form.city, postal_code: form.postal_code,
        lang: i18n.language,
      });
      onSuccess(user);
    } catch (err) {
      setError(err.message || t('auth.registerError'));
    } finally { setLoading(false); }
  };

  const inp = (k, type = 'text', placeholder = '', required = true) => (
    <input className={inputCls} type={type} value={form[k]} onChange={set(k)} placeholder={placeholder} required={required} />
  );

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="font-serif text-[22px] text-navy">{t('auth.registerTitle')}</h3>
      <p className="mb-4 mt-1 text-xs text-navy/50">{t('auth.registerSubtitle')}</p>
      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>}

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div><label className={labelCls}>{t('auth.firstName')} *</label>{inp('first_name', 'text', 'Ex: Kofi')}</div>
        <div><label className={labelCls}>{t('auth.lastName')} *</label>{inp('last_name', 'text', 'Ex: Mensah')}</div>
      </div>
      <div className="mb-3"><label className={labelCls}>{t('auth.emailGmail')} *</label>{inp('email', 'email', 'votre@gmail.com')}</div>
      <div className="mb-3">
        <label className={labelCls}>{t('auth.phoneOptional')} <span className="font-light text-navy/40">{t('auth.optionalTag')}</span></label>
        {inp('phone', 'tel', 'Ex: 0612345678', false)}
      </div>
      <div className="mb-3">
        <label className={labelCls}>{t('auth.addressOptional')} <span className="font-light text-navy/40">{t('auth.optionalTag')}</span></label>
        {inp('address', 'text', 'Ex: 12 rue de la Paix', false)}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div>
          <label className={labelCls}>{t('auth.cityOptional')} <span className="font-light text-navy/40">{t('auth.optionalTag')}</span></label>
          {inp('city', 'text', 'Ex: Villejuif', false)}
        </div>
        <div>
          <label className={labelCls}>{t('auth.postalCodeOptional')} <span className="font-light text-navy/40">{t('auth.optionalTag')}</span></label>
          {inp('postal_code', 'text', 'Ex: 94800', false)}
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div><label className={labelCls}>{t('auth.password')} *</label>{inp('password', 'password', t('auth.passwordMin'))}</div>
        <div><label className={labelCls}>{t('auth.confirmPasswordLabel')} *</label>{inp('confirm', 'password', t('auth.confirmRepeat'))}</div>
      </div>
      <p className="mb-2.5 text-[10px] text-navy/40">{t('auth.requiredNote')}</p>
      <button className={submitCls} type="submit" disabled={loading}>
        {loading ? t('auth.creatingAccount') : t('auth.createAccountButton')}
      </button>
      <div className="mt-3.5 text-center text-xs text-navy/50">
        {t('auth.alreadyAccount')} <span className={linkCls} onClick={onLogin}>{t('auth.loginButton')}</span>
      </div>
    </form>
  );
}

function ForgotForm({ onBack }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || t('auth.genericError'));
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h3 className="font-serif text-[22px] text-navy">{t('auth.forgotTitle')}</h3>
      <p className="mb-4 mt-1 text-xs text-navy/50">{t('auth.forgotSubtitle')}</p>
      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>}
      {sent ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-800">
          <i className="ti ti-circle-check mr-1.5" />
          {t('auth.forgotSent')}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className={labelCls}>{t('auth.yourGmailAddress')}</label>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@gmail.com" required autoFocus />
          </div>
          <button className={submitCls} type="submit" disabled={loading}>
            {loading ? t('auth.sendingLink') : t('auth.sendLinkButton')}
          </button>
        </form>
      )}
      <div className="mt-3.5 text-center">
        <span className={linkCls} onClick={onBack}>{t('auth.backToLogin')}</span>
      </div>
    </div>
  );
}

// ─── SHARED BITS ──────────────────────────────────────────────────
function Brand({ sizeCls = 'h-8 w-8 sm:h-9 sm:w-9', textCls = 'text-base sm:text-xl', dark = true }) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <img src={logo} alt="OjadaBank" className={`shrink-0 rounded-full ring-1 ring-gold/50 ${sizeCls}`} />
      <span className={`whitespace-nowrap font-serif font-semibold tracking-wide ${textCls} ${dark ? 'text-white' : 'text-navy'}`}>OJADA BANK</span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [view, setView] = useState('login'); // login | register | forgot
  const [menuOpen, setMenuOpen] = useState(false);

  const services = getServices(t);
  const steps = getSteps(t);
  const testimonials = getTestimonials(t);
  const navItems = [
    ['services', t('landing.navServices')],
    ['comment', t('landing.navHow')],
    ['temoignages', t('landing.navTestimonials')],
    ['contact', t('landing.navContact')],
  ];

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : '/client', { replace: true });
  }, [user, navigate]);

  const openModal = (v = 'login') => { setView(v); setModal(true); };
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false); };

  const handleSuccess = (user) => {
    setModal(false);
    navigate(user.role === 'admin' ? '/admin' : '/client');
  };

  return (
    <div className="overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed inset-x-0 top-0 z-[100] flex h-[68px] items-center justify-between gap-3 border-b border-gold/20 bg-navy/95 px-4 backdrop-blur-md sm:px-8 lg:px-12">
        <Brand />

        <div className="hidden shrink-0 items-center gap-7 lg:flex">
          {navItems.map(([id, label]) => (
            <span key={id} className="cursor-pointer text-[13px] text-white/65 transition-colors hover:text-gold-light" onClick={() => scrollTo(id)}>
              {label}
            </span>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <LanguageSwitcher dark />
          <button
            className="rounded-md bg-gold px-4 py-2 text-xs font-medium text-navy transition-opacity hover:opacity-90"
            onClick={() => openModal()}
          >
            {t('auth.loginButton')}
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center text-xl text-white lg:hidden"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="menu"
          >
            <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-x-0 top-[68px] z-[99] border-b border-gold/20 bg-navy px-5 py-4 lg:hidden">
          {navItems.map(([id, label]) => (
            <div
              key={id}
              onClick={() => scrollTo(id)}
              className="cursor-pointer border-b border-white/[0.06] py-3 text-sm text-white/70 last:border-0"
            >
              {label}
            </div>
          ))}
          <button
            className="mt-3.5 w-full rounded-md border border-gold/50 py-2.5 text-xs text-gold-light"
            onClick={() => { openModal(); setMenuOpen(false); }}
          >
            {t('auth.loginButton')}
          </button>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden bg-navy px-4 pb-14 pt-28 sm:px-8 lg:px-12" id="home">
        <div className="pointer-events-none absolute -right-20 -top-24 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.1)_0%,transparent_70%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(201,168,76,0.5) 40px,rgba(201,168,76,0.5) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(201,168,76,0.5) 40px,rgba(201,168,76,0.5) 41px)' }}
        />

        <div className="relative z-10 mx-auto grid max-w-6xl gap-12 py-6 lg:grid-cols-[1fr_380px] lg:items-center lg:py-10">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 px-3.5 py-1.5 text-[11px] uppercase tracking-[2px] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {t('landing.heroEyebrow')}
            </div>
            <h1 className="mb-5 font-serif text-[clamp(36px,6vw,64px)] font-semibold leading-[1.12] text-white">
              {t('landing.heroTitleLine1')}<br />
              {t('landing.heroTitleLine2')} <span className="text-gold">{t('landing.heroTitleHighlight')}</span><br />
              {t('landing.heroTitleLine3')}
            </h1>
            <p className="mb-9 max-w-lg text-[15px] font-light leading-[1.75] text-white/55">{t('landing.heroP')}</p>
            <div className="mb-12 flex flex-wrap gap-3">
              <button className="rounded-md bg-gold px-7 py-3.5 text-sm font-medium text-navy transition-opacity hover:opacity-90" onClick={() => openModal('register')}>
                {t('landing.openAccount')}
              </button>
              <button className="rounded-md border border-white/20 px-7 py-3.5 text-sm text-white/75 transition-colors hover:border-white/40" onClick={() => scrollTo('services')}>
                {t('landing.discoverServices')}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4 border-t border-white/[0.08] pt-7">
              {[['24+', t('landing.statActiveClients')], ['8,75M €', t('landing.statManaged')], ['100%', t('landing.statSecured')]].map(([n, l]) => (
                <div key={l}>
                  <div className="font-serif text-3xl font-semibold leading-none text-gold">{n}</div>
                  <div className="mt-1 text-[11px] text-white/35">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="mb-2.5 rounded-2xl border border-gold/20 bg-white/5 p-5 backdrop-blur-sm">
              <div className="mb-7 flex items-center justify-between">
                <div className="h-[26px] w-[34px] rounded opacity-80" style={{ background: 'var(--gold)' }} />
                <span className="font-serif text-[13px] tracking-wide text-white/50">OJADA</span>
              </div>
              <div className="mb-4 font-mono text-sm tracking-[3px] text-white/60">•••• •••• •••• 4421</div>
              <div className="flex items-end justify-between">
                <span className="text-xs uppercase tracking-wide text-white/40">K. Mensah</span>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-gold/50">{t('landing.mockBalance')}</div>
                  <div className="font-serif text-xl text-gold">147 000 €</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[rgba(123,198,122,0.15)] text-base text-[#7BC67A]">
                <i className="ti ti-arrow-down-left" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-white/80">{t('landing.mockDepositReceived')}</div>
                <div className="mt-0.5 text-[10px] text-white/30">{t('common.today')} · 09:14</div>
              </div>
              <div className="shrink-0 text-[13px] font-medium text-[#7BC67A]">+30 000 €</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <div className="bg-navy-2 px-4 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-7 text-center sm:grid-cols-3 lg:grid-cols-5">
          {[['2024', t('landing.trustFoundation')], ['24/7', t('landing.trustAvailable')], ['0 €', t('landing.trustOpening')], ['100%', t('landing.trustSecured')], ['Île-de-France', t('landing.trustRegion')]].map(([n, l]) => (
            <div key={l}>
              <div className="font-serif text-2xl font-semibold text-gold sm:text-[32px]">{n}</div>
              <div className="mt-1 text-[11px] text-white/40">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SERVICES */}
      <section className="bg-cream px-4 py-16 sm:px-8 sm:py-20 lg:px-12" id="services">
        <div className="mx-auto max-w-6xl">
          <div className="mb-2.5 text-[11px] uppercase tracking-[2px] text-gold-dark">{t('landing.servicesTag')}</div>
          <h2 className="mb-3.5 font-serif text-[clamp(26px,4vw,40px)] font-semibold leading-[1.15] text-navy">
            {t('landing.servicesTitleLine1')}<br />{t('landing.servicesTitleLine2')}
          </h2>
          <p className="mb-11 max-w-lg text-sm font-light leading-[1.7] text-navy/60">{t('landing.servicesSub')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(sv => (
              <div
                key={sv.name}
                className="group rounded-xl border border-[#E8E2D6] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-[0_16px_48px_rgba(10,22,40,0.08)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#FDF6E3] text-xl text-gold-dark">
                  <i className={`ti ${sv.icon}`} />
                </div>
                <div className="mb-2 font-serif text-xl font-semibold text-navy">{sv.name}</div>
                <div className="text-[13px] font-light leading-[1.65] text-navy/60">{sv.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="bg-cream-2 px-4 py-16 sm:px-8 sm:py-20 lg:px-12" id="comment">
        <div className="mx-auto max-w-6xl">
          <div className="mb-2.5 text-[11px] uppercase tracking-[2px] text-gold-dark">{t('landing.howTag')}</div>
          <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-semibold leading-[1.15] text-navy">{t('landing.howTitle')}</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(st => (
              <div key={st.num} className="px-1 text-center">
                <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-gold bg-white font-serif text-xl text-gold">
                  {st.num}
                </div>
                <div className="mb-1.5 font-serif text-lg font-semibold text-navy">{st.title}</div>
                <div className="text-xs leading-[1.6] text-navy/60">{st.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-cream px-4 py-16 sm:px-8 sm:py-20 lg:px-12" id="temoignages">
        <div className="mx-auto max-w-6xl">
          <div className="mb-2.5 text-[11px] uppercase tracking-[2px] text-gold-dark">{t('landing.testimonialsTag')}</div>
          <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-semibold leading-[1.15] text-navy">{t('landing.testimonialsTitle')}</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map(tm => (
              <div key={tm.author} className="rounded-xl border border-[#E8E2D6] bg-white p-6">
                <div className="mb-3 text-[13px] text-gold">★★★★★</div>
                <div className="mb-4.5 text-[13px] font-light italic leading-[1.7] text-navy/60">{tm.text}</div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ background: tm.color, color: tm.textColor }}
                  >
                    {tm.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-navy">{tm.author}</div>
                    <div className="truncate text-[11px] text-navy/60">{tm.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-navy px-4 py-16 text-center sm:py-20" id="contact">
        <h2 className="relative mb-3.5 font-serif text-[clamp(26px,4vw,46px)] leading-tight text-white">
          <Trans i18nKey="landing.ctaTitle" components={{ b: <span className="text-gold" /> }} />
        </h2>
        <p className="relative mx-auto mb-9 max-w-md text-[15px] font-light leading-[1.7] text-white/45">{t('landing.ctaP')}</p>
        <div className="relative flex flex-wrap justify-center gap-3.5">
          <button className="rounded-md bg-gold px-7 py-3.5 text-sm font-medium text-navy transition-opacity hover:opacity-90" onClick={() => openModal('register')}>
            {t('landing.ctaOpenAccount')}
          </button>
          <button className="rounded-md border border-white/20 px-7 py-3.5 text-sm text-white/75 transition-colors hover:border-white/40">
            {t('landing.ctaContactUs')}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gold/15 bg-[#070F1E] px-4 pb-8 pt-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Brand sizeCls="h-8 w-8" textCls="text-base" />
            <p className="mt-3 max-w-[240px] text-xs font-light leading-[1.7] text-white/30">{t('landing.footerTagline')}</p>
          </div>
          {[
            [t('landing.footerColServices'), [services[0].name, services[1].name, services[2].name, services[3].name]],
            [t('landing.footerColBank'), [t('landing.footerAbout'), t('landing.footerTeam'), t('landing.footerCareers'), t('landing.navContact')]],
            [t('landing.footerColLegal'), [t('landing.footerTerms'), t('landing.footerPrivacy'), t('landing.footerLegalNotice')]],
          ].map(([title, links]) => (
            <div key={title} className="min-w-0">
              <div className="mb-3.5 text-[10px] uppercase tracking-[1.5px] text-gold">{title}</div>
              {links.map(l => (
                <span key={l} className="mb-2.5 block cursor-pointer truncate text-xs text-white/35 transition-colors hover:text-white/60">
                  {l}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="mx-auto mt-9 flex max-w-6xl flex-col gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-white/20">{t('landing.footerCopyright')}</span>
          <span className="text-[11px] text-white/20">{t('landing.footerAgreement')}</span>
        </div>
      </footer>

      {/* MODAL */}
      {modal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-[rgba(7,15,30,0.88)] p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div className="relative my-auto w-full max-w-[460px] rounded-2xl border border-[#E8E2D6] bg-cream p-7 sm:p-8">
            <button
              className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-md text-lg text-navy/50 hover:bg-black/5"
              onClick={() => setModal(false)}
            >
              ✕
            </button>
            <div className="mb-5">
              <Brand sizeCls="h-8 w-8" textCls="text-base" dark={false} />
            </div>

            {view === 'login' && <LoginForm onSuccess={handleSuccess} onForgot={() => setView('forgot')} onRegister={() => setView('register')} />}
            {view === 'register' && <RegisterForm onSuccess={handleSuccess} onLogin={() => setView('login')} />}
            {view === 'forgot' && <ForgotForm onBack={() => setView('login')} />}
          </div>
        </div>
      )}
    </div>
  );
}
