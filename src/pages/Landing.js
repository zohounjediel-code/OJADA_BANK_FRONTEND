import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

const s = {
  nav: { position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(16px,4vw,60px)', height:68, background:'rgba(10,22,40,0.96)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(201,168,76,0.2)' },
  navLogo: { display:'flex', alignItems:'center', gap:10 },
  navLogoIcon: { width:36, height:36, background:'var(--gold)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--serif)', fontWeight:700, fontSize:15, color:'var(--navy)' },
  navLogoText: { fontFamily:'var(--serif)', fontSize:20, fontWeight:600, color:'#fff', letterSpacing:1 },
  navLinks: { display:'flex', alignItems:'center', gap:28 },
  navLink: { fontSize:13, color:'rgba(255,255,255,0.65)', transition:'color 0.2s', cursor:'pointer' },
  navCta: { display:'flex', gap:10 },
  btnOutline: { padding:'8px 18px', border:'1px solid rgba(201,168,76,0.5)', borderRadius:6, fontSize:12, color:'var(--gold-light)', background:'transparent', cursor:'pointer', transition:'all 0.2s', fontFamily:'var(--sans)' },
  btnPrimary: { padding:'8px 18px', border:'none', borderRadius:6, fontSize:12, color:'var(--navy)', background:'var(--gold)', cursor:'pointer', transition:'all 0.2s', fontWeight:500, fontFamily:'var(--sans)' },
  hero: { minHeight:'100vh', display:'flex', alignItems:'center', background:'var(--navy)', padding:'100px clamp(16px,4vw,60px) 60px', position:'relative', overflow:'hidden' },
  heroGlow: { position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', top:-100, right:-80, pointerEvents:'none' },
  heroContent: { maxWidth:620, position:'relative', zIndex:1, animation:'fadeIn 0.7s ease forwards' },
  heroEyebrow: { display:'inline-flex', alignItems:'center', gap:8, fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'var(--gold)', marginBottom:24, padding:'5px 14px', border:'1px solid rgba(201,168,76,0.3)', borderRadius:20 },
  heroH1: { fontFamily:'var(--serif)', fontSize:'clamp(40px,6vw,68px)', fontWeight:600, lineHeight:1.08, color:'#fff', marginBottom:20 },
  heroP: { fontSize:15, color:'rgba(255,255,255,0.55)', lineHeight:1.75, maxWidth:500, marginBottom:36, fontWeight:300 },
  heroActions: { display:'flex', gap:12, marginBottom:48, flexWrap:'wrap' },
  btnHeroPrimary: { padding:'13px 28px', borderRadius:6, fontSize:14, fontWeight:500, cursor:'pointer', background:'var(--gold)', color:'var(--navy)', border:'none', transition:'all 0.25s', fontFamily:'var(--sans)' },
  btnHeroSecondary: { padding:'13px 28px', borderRadius:6, fontSize:14, cursor:'pointer', background:'transparent', color:'rgba(255,255,255,0.75)', border:'1px solid rgba(255,255,255,0.2)', transition:'all 0.25s', fontFamily:'var(--sans)' },
  heroStats: { display:'flex', gap:40, paddingTop:28, borderTop:'1px solid rgba(255,255,255,0.08)', flexWrap:'wrap' },
  statNum: { fontFamily:'var(--serif)', fontSize:30, fontWeight:600, color:'var(--gold)', lineHeight:1 },
  statLabel: { fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3 },
  heroVisual: { position:'absolute', right:'clamp(16px,4vw,60px)', top:'50%', transform:'translateY(-50%)', width:'min(380px,42vw)', zIndex:1 },
  cardMock: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:16, padding:22, backdropFilter:'blur(8px)', marginBottom:10 },
  trust: { background:'var(--navy2)', padding:'48px clamp(16px,4vw,60px)', display:'flex', alignItems:'center', justifyContent:'space-around', gap:20, flexWrap:'wrap' },
  trustItem: { textAlign:'center', padding:'8px 0' },
  trustNum: { fontFamily:'var(--serif)', fontSize:36, fontWeight:600, color:'var(--gold)' },
  trustLabel: { fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:3 },
  services: { padding:'80px clamp(16px,4vw,60px)', background:'var(--cream)' },
  sectionTag: { fontSize:11, letterSpacing:2, textTransform:'uppercase', color:'var(--gold-dark)', marginBottom:10 },
  sectionTitle: { fontFamily:'var(--serif)', fontSize:'clamp(28px,4vw,44px)', fontWeight:600, color:'var(--navy)', lineHeight:1.15, marginBottom:14 },
  sectionSub: { fontSize:14, color:'var(--text2)', maxWidth:480, lineHeight:1.7, marginBottom:48, fontWeight:300 },
  servicesGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16 },
  serviceCard: { background:'#fff', border:'1px solid #E8E2D6', borderRadius:12, padding:'28px 24px', transition:'all 0.3s', cursor:'pointer' },
  serviceIcon: { width:44, height:44, borderRadius:10, background:'#FDF6E3', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, fontSize:20, color:'var(--gold-dark)' },
  serviceName: { fontFamily:'var(--serif)', fontSize:20, fontWeight:600, color:'var(--navy)', marginBottom:8 },
  serviceDesc: { fontSize:13, color:'var(--text2)', lineHeight:1.65, fontWeight:300 },
  how: { padding:'80px clamp(16px,4vw,60px)', background:'var(--cream2)' },
  stepsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, marginTop:48 },
  step: { textAlign:'center', padding:'0 12px' },
  stepNum: { width:52, height:52, borderRadius:'50%', background:'#fff', border:'1px solid var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--serif)', fontSize:20, color:'var(--gold)', margin:'0 auto 16px' },
  stepTitle: { fontFamily:'var(--serif)', fontSize:17, fontWeight:600, color:'var(--navy)', marginBottom:7 },
  stepDesc: { fontSize:12, color:'var(--text2)', lineHeight:1.6, fontWeight:300 },
  testimonials: { padding:'80px clamp(16px,4vw,60px)', background:'var(--cream)' },
  testimonialGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16, marginTop:48 },
  testimonialCard: { background:'#fff', border:'1px solid #E8E2D6', borderRadius:12, padding:24 },
  testimonialText: { fontSize:13, color:'var(--text2)', lineHeight:1.7, fontStyle:'italic', marginBottom:18, fontWeight:300 },
  authorName: { fontSize:12, fontWeight:500, color:'var(--navy)' },
  authorRole: { fontSize:11, color:'var(--text2)' },
  cta: { background:'var(--navy)', padding:'80px clamp(16px,4vw,60px)', textAlign:'center', position:'relative', overflow:'hidden' },
  ctaH2: { fontFamily:'var(--serif)', fontSize:'clamp(28px,4vw,50px)', color:'#fff', marginBottom:14, position:'relative' },
  ctaP: { fontSize:15, color:'rgba(255,255,255,0.45)', maxWidth:440, margin:'0 auto 36px', fontWeight:300, lineHeight:1.7, position:'relative' },
  ctaActions: { display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', position:'relative' },
  footer: { background:'#070F1E', padding:'48px clamp(16px,4vw,60px)', borderTop:'1px solid rgba(201,168,76,0.15)' },
  footerGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:32, marginBottom:36 },
  footerColTitle: { fontSize:10, letterSpacing:1.5, textTransform:'uppercase', color:'var(--gold)', marginBottom:14 },
  footerLink: { display:'block', fontSize:12, color:'rgba(255,255,255,0.35)', marginBottom:9, cursor:'pointer', transition:'color 0.2s' },
  footerBottom: { display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:20, borderTop:'1px solid rgba(255,255,255,0.06)', flexWrap:'wrap', gap:8 },
  footerBottomText: { fontSize:11, color:'rgba(255,255,255,0.2)' },
  overlay: { position:'fixed', inset:0, background:'rgba(7,15,30,0.88)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)', padding:16, overflowY:'auto' },
  modal: { background:'var(--cream)', borderRadius:16, padding:'32px 28px', width:'100%', maxWidth:460, position:'relative', border:'1px solid #E8E2D6', animation:'fadeIn 0.25s ease', margin:'auto' },
  modalClose: { position:'absolute', top:14, right:14, width:28, height:28, border:'none', background:'transparent', cursor:'pointer', fontSize:18, color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6 },
  roleSwitch: { display:'flex', background:'#EDE8DF', borderRadius:6, padding:3, marginBottom:20 },
  roleBtn: { flex:1, padding:'7px', border:'none', borderRadius:4, fontSize:12, cursor:'pointer', background:'transparent', color:'var(--text2)', transition:'all 0.2s', fontFamily:'var(--sans)' },
  roleBtnActive: { background:'#fff', color:'var(--navy)', fontWeight:500, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' },
  formGroup: { marginBottom:12 },
  formLabel: { fontSize:11, color:'var(--text2)', marginBottom:5, display:'block' },
  formInput: { width:'100%', height:40, border:'1px solid #D8D2C6', borderRadius:7, padding:'0 12px', fontSize:13, color:'var(--text)', background:'#fff', outline:'none', fontFamily:'var(--sans)', transition:'border-color 0.2s' },
  formRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  formSubmit: { width:'100%', height:42, background:'var(--navy)', border:'none', borderRadius:7, fontSize:13, color:'#fff', cursor:'pointer', marginTop:6, fontWeight:500, fontFamily:'var(--sans)', transition:'opacity 0.15s' },
  errBox: { background:'#FCEBEB', border:'1px solid #F7C1C1', borderRadius:7, padding:'9px 12px', fontSize:12, color:'#A32D2D', marginBottom:12 },
  successBox: { background:'#EAF3DE', border:'1px solid #C0DD97', borderRadius:7, padding:'9px 12px', fontSize:12, color:'#3B6D11', marginBottom:12 },
  tabLink: { color:'var(--gold-dark)', cursor:'pointer', fontSize:12 },
};

const services = [
  { icon:'ti-credit-card', name:'Compte courant', desc:'Un compte flexible pour vos opérations du quotidien. Dépôts, retraits et virements.' },
  { icon:'ti-piggy-bank', name:'Compte épargne', desc:'Faites fructifier votre argent avec un taux d\'intérêt compétitif. Votre épargne protégée.' },
  { icon:'ti-building', name:'Compte entreprise', desc:'Solutions dédiées aux PME. Gestion multi-utilisateurs et outils de suivi avancés.' },
  { icon:'ti-send', name:'Virements', desc:'Transférez de l\'argent instantanément vers n\'importe quel compte OJADA.' },
  { icon:'ti-chart-line', name:'Suivi en temps réel', desc:'Accédez à l\'historique complet de vos transactions et relevés en ligne.' },
  { icon:'ti-shield-check', name:'Sécurité renforcée', desc:'Fonds protégés par des protocoles bancaires stricts et surveillance continue.' },
];
const steps = [
  { num:'1', title:'Inscription', desc:'Remplissez votre demande en ligne avec vos informations personnelles.' },
  { num:'2', title:'Vérification', desc:'Notre équipe vérifie vos documents et valide votre identité sous 24h.' },
  { num:'3', title:'Activation', desc:'Votre compte est activé et vous recevez vos accès par SMS.' },
  { num:'4', title:'Utilisation', desc:'Effectuez dépôts, retraits et virements depuis votre espace.' },
];
const testimonials = [
  { text:'"OJADA BANK a simplifié ma gestion financière. Les virements sont instantanés et le service client toujours disponible."', author:'Kofi Mensah', role:'Chef de projet, Villejuif', initials:'KM', color:'#E6F1FB', textColor:'#185FA5' },
  { text:'"Enfin une banque de proximité qui comprend les besoins des petites entreprises. Mon compte entreprise me donne une visibilité totale."', author:'Fatou Ndiaye', role:'Gérante SARL, Vitry-sur-Seine', initials:'FN', color:'#FBEAF0', textColor:'#993556' },
  { text:'"Le compte épargne OJADA m\'a permis de mettre de côté pour mon projet. Interface claire et taux intéressant."', author:'Aïssatou Diallo', role:'Enseignante, Ivry-sur-Seine', initials:'AD', color:'#EAF3DE', textColor:'#3B6D11' },
];

// ─── MODAL CONTENT ────────────────────────────────────────────────
function LoginForm({ onSuccess, onForgot, onRegister }) {
  const { t } = useTranslation();
  const { loginClient } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await loginClient(email, password);
      onSuccess(user);
    } catch (err) {
      setError(err.message || t('auth.err_login_invalid'));
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontFamily:'var(--serif)', fontSize:22, color:'var(--navy)', marginBottom:4 }}>{t('auth.clientLoginTitle')}</h3>
      <p style={{ fontSize:12, color:'var(--text2)', marginBottom:18 }}>{t('auth.clientLoginSubtitle')}</p>
      {error && <div style={s.errBox}>{error}</div>}
      <div style={s.formGroup}>
        <label style={s.formLabel}>{t('auth.emailGmail')}</label>
        <input style={s.formInput} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@gmail.com" required autoFocus/>
      </div>
      <div style={s.formGroup}>
        <label style={s.formLabel}>{t('auth.password')}</label>
        <input style={s.formInput} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/>
      </div>
      <button style={{ ...s.formSubmit, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
        {loading ? t('auth.loggingIn') : t('auth.loginButton')}
      </button>
      <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'var(--text2)' }}>
        <span style={s.tabLink} onClick={onForgot}>{t('auth.forgotPassword')}</span>
        {' · '}
        <span style={s.tabLink} onClick={onRegister}>{t('auth.register')}</span>
      </div>
    </form>
  );
}

function AdminLoginForm({ onSuccess }) {
  const { t } = useTranslation();
  const { loginAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await loginAdmin(username, password);
      onSuccess(user);
    } catch (err) {
      setError(err.message || t('auth.err_admin_invalid'));
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontFamily:'var(--serif)', fontSize:22, color:'var(--navy)', marginBottom:4 }}>{t('auth.adminLoginTitle')}</h3>
      <p style={{ fontSize:12, color:'var(--text2)', marginBottom:18 }}>{t('auth.adminLoginSubtitle')}</p>
      {error && <div style={s.errBox}>{error}</div>}
      <div style={s.formGroup}>
        <label style={s.formLabel}>{t('auth.username')}</label>
        <input style={s.formInput} type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" required autoFocus/>
      </div>
      <div style={s.formGroup}>
        <label style={s.formLabel}>{t('auth.password')}</label>
        <input style={s.formInput} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/>
      </div>
      <button style={{ ...s.formSubmit, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
        {loading ? t('auth.loggingIn') : t('auth.loginButton')}
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess, onLogin }) {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const [form, setForm] = useState({ email:'', password:'', confirm:'', first_name:'', last_name:'', phone:'', address:'', city:'', postal_code:'' });
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

  const inp = (k, type='text', placeholder='', required=true) => (
    <input style={s.formInput} type={type} value={form[k]} onChange={set(k)} placeholder={placeholder} required={required}/>
  );

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontFamily:'var(--serif)', fontSize:22, color:'var(--navy)', marginBottom:4 }}>{t('auth.registerTitle')}</h3>
      <p style={{ fontSize:12, color:'var(--text2)', marginBottom:16 }}>{t('auth.registerSubtitle')}</p>
      {error && <div style={s.errBox}>{error}</div>}

      <div style={s.formRow}>
        <div style={s.formGroup}><label style={s.formLabel}>{t('auth.firstName')} *</label>{inp('first_name','text','Ex: Kofi')}</div>
        <div style={s.formGroup}><label style={s.formLabel}>{t('auth.lastName')} *</label>{inp('last_name','text','Ex: Mensah')}</div>
      </div>
      <div style={s.formGroup}><label style={s.formLabel}>{t('auth.emailGmail')} *</label>{inp('email','email','votre@gmail.com')}</div>
      <div style={s.formGroup}>
        <label style={s.formLabel}>{t('auth.phoneOptional')} <span style={{ color:'var(--text2)', fontWeight:300 }}>{t('auth.optionalTag')}</span></label>
        {inp('phone','tel','Ex: 0612345678', false)}
      </div>
      <div style={s.formGroup}>
        <label style={s.formLabel}>{t('auth.addressOptional')} <span style={{ color:'var(--text2)', fontWeight:300 }}>{t('auth.optionalTag')}</span></label>
        {inp('address','text','Ex: 12 rue de la Paix', false)}
      </div>
      <div style={s.formRow}>
        <div style={s.formGroup}>
          <label style={s.formLabel}>{t('auth.cityOptional')} <span style={{ color:'var(--text2)', fontWeight:300 }}>{t('auth.optionalTag')}</span></label>
          {inp('city','text','Ex: Villejuif', false)}
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>{t('auth.postalCodeOptional')} <span style={{ color:'var(--text2)', fontWeight:300 }}>{t('auth.optionalTag')}</span></label>
          {inp('postal_code','text','Ex: 94800', false)}
        </div>
      </div>
      <div style={s.formRow}>
        <div style={s.formGroup}><label style={s.formLabel}>{t('auth.password')} *</label>{inp('password','password',t('auth.passwordMin'))}</div>
        <div style={s.formGroup}><label style={s.formLabel}>{t('auth.confirmPasswordLabel')} *</label>{inp('confirm','password',t('auth.confirmRepeat'))}</div>
      </div>
      <p style={{ fontSize:10, color:'var(--text2)', marginBottom:10 }}>{t('auth.requiredNote')}</p>
      <button style={{ ...s.formSubmit, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
        {loading ? t('auth.creatingAccount') : t('auth.createAccountButton')}
      </button>
      <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'var(--text2)' }}>
        {t('auth.alreadyAccount')} <span style={s.tabLink} onClick={onLogin}>{t('auth.loginButton')}</span>
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
      <h3 style={{ fontFamily:'var(--serif)', fontSize:22, color:'var(--navy)', marginBottom:4 }}>{t('auth.forgotTitle')}</h3>
      <p style={{ fontSize:12, color:'var(--text2)', marginBottom:18 }}>{t('auth.forgotSubtitle')}</p>
      {error && <div style={s.errBox}>{error}</div>}
      {sent ? (
        <div style={s.successBox}>
          <i className="ti ti-circle-check" style={{ marginRight:6 }}/>
          {t('auth.forgotSent')}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={s.formGroup}>
            <label style={s.formLabel}>{t('auth.yourGmailAddress')}</label>
            <input style={s.formInput} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@gmail.com" required autoFocus/>
          </div>
          <button style={{ ...s.formSubmit, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? t('auth.sendingLink') : t('auth.sendLinkButton')}
          </button>
        </form>
      )}
      <div style={{ textAlign:'center', marginTop:14 }}>
        <span style={s.tabLink} onClick={onBack}>{t('auth.backToLogin')}</span>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [role, setRole] = useState('client');
  const [view, setView] = useState('login'); // login | register | forgot
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : '/client', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const openModal = (r, v='login') => { setRole(r); setView(v); setModal(true); };
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior:'smooth' }); setMenuOpen(false); };

  const handleSuccess = (user) => {
    setModal(false);
    navigate(user.role === 'admin' ? '/admin' : '/client');
  };

  return (
    <div>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLogo}>
          <div style={s.navLogoIcon}>OJ</div>
          <span style={s.navLogoText}>OJADA BANK</span>
        </div>
        {!isMobile && (
          <div style={s.navLinks}>
            {['services','comment','temoignages','contact'].map(id => (
              <span key={id} style={s.navLink} onClick={() => scrollTo(id)}>
                {id==='services'?'Services':id==='comment'?'Comment ça marche':id==='temoignages'?'Témoignages':'Contact'}
              </span>
            ))}
          </div>
        )}
        <div style={s.navCta}>
          <LanguageSwitcher dark style={{ marginRight: 4 }}/>
          {!isMobile && <button style={s.btnOutline} onClick={() => openModal('client')}>{t('auth.clientSpace')}</button>}
          <button style={s.btnPrimary} onClick={() => openModal('admin')}>
            {isMobile ? t('auth.connexionShort') : t('auth.administration')}
          </button>
          {isMobile && (
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background:'transparent', border:'none', color:'#fff', fontSize:22, cursor:'pointer', marginLeft:4 }}>
              <i className={`ti ${menuOpen?'ti-x':'ti-menu-2'}`}/>
            </button>
          )}
        </div>
      </nav>

      {isMobile && menuOpen && (
        <div style={{ position:'fixed', top:68, left:0, right:0, background:'var(--navy)', zIndex:99, padding:'16px 20px', borderBottom:'1px solid rgba(201,168,76,0.2)', animation:'fadeIn 0.2s ease' }}>
          {['services','comment','temoignages','contact'].map(id => (
            <div key={id} onClick={() => scrollTo(id)} style={{ padding:'12px 0', fontSize:14, color:'rgba(255,255,255,0.7)', borderBottom:'1px solid rgba(255,255,255,0.06)', cursor:'pointer' }}>
              {id==='services'?'Services':id==='comment'?'Comment ça marche':id==='temoignages'?'Témoignages':'Contact'}
            </div>
          ))}
          <button style={{ ...s.btnOutline, width:'100%', marginTop:14, padding:'11px 0' }} onClick={() => { openModal('client'); setMenuOpen(false); }}>Espace client</button>
        </div>
      )}

      {/* HERO */}
      <section style={s.hero} id="home">
        <div style={s.heroGlow}/>
        <div style={{ position:'absolute', inset:0, opacity:0.03, backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(201,168,76,0.5) 40px,rgba(201,168,76,0.5) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(201,168,76,0.5) 40px,rgba(201,168,76,0.5) 41px)' }}/>
        <div style={s.heroContent}>
          <div style={s.heroEyebrow}><span style={{ width:6, height:6, background:'var(--gold)', borderRadius:'50%' }}/>Banque régionale · Villejuif</div>
          <h1 style={s.heroH1}>Votre argent,<br/>en <span style={{ color:'var(--gold)' }}>sécurité</span><br/>et à portée.</h1>
          <p style={s.heroP}>OJADA BANK vous offre des services bancaires fiables, rapides et accessibles. Gérez vos comptes et effectuez vos transactions depuis Villejuif.</p>
          <div style={s.heroActions}>
            <button style={s.btnHeroPrimary} onClick={() => openModal('client','register')}>Ouvrir un compte</button>
            <button style={s.btnHeroSecondary} onClick={() => scrollTo('services')}>Découvrir nos services</button>
          </div>
          <div style={s.heroStats}>
            {[['24+','Clients actifs'],['8,75M €','Gérés'],['100%','Sécurisé']].map(([n,l]) => (
              <div key={l}><div style={s.statNum}>{n}</div><div style={s.statLabel}>{l}</div></div>
            ))}
          </div>
        </div>
        {!isMobile && (
          <div style={s.heroVisual}>
            <div style={s.cardMock}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:28 }}>
                <div style={{ width:34, height:26, background:'var(--gold)', borderRadius:4, opacity:0.8 }}/>
                <span style={{ fontFamily:'var(--serif)', fontSize:13, color:'rgba(255,255,255,0.5)', letterSpacing:1 }}>OJADA</span>
              </div>
              <div style={{ fontFamily:'monospace', fontSize:14, color:'rgba(255,255,255,0.6)', letterSpacing:3, marginBottom:16 }}>•••• •••• •••• 4421</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:1 }}>K. Mensah</span>
                <div>
                  <div style={{ fontSize:10, color:'rgba(201,168,76,0.5)', textTransform:'uppercase', letterSpacing:1 }}>Solde</div>
                  <div style={{ fontFamily:'var(--serif)', fontSize:20, color:'var(--gold)' }}>147 000 €</div>
                </div>
              </div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'rgba(123,198,122,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#7BC67A' }}><i className="ti ti-arrow-down-left"/></div>
              <div style={{ flex:1 }}><div style={{ fontSize:12, color:'rgba(255,255,255,0.8)' }}>Dépôt reçu</div><div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>Aujourd'hui · 09:14</div></div>
              <div style={{ fontSize:13, fontWeight:500, color:'#7BC67A' }}>+30 000 €</div>
            </div>
          </div>
        )}
      </section>

      {/* TRUST */}
      <div style={s.trust}>
        {[['2024','Fondation'],['24/7','Disponible'],['0 €','Ouverture'],['100%','Sécurisé'],['Île-de-France','Région']].map(([n,l]) => (
          <div key={l} style={s.trustItem}><div style={s.trustNum}>{n}</div><div style={s.trustLabel}>{l}</div></div>
        ))}
      </div>

      {/* SERVICES */}
      <section style={s.services} id="services">
        <div style={s.sectionTag}>Nos services</div>
        <div style={s.sectionTitle}>Tout ce dont vous avez<br/>besoin, au même endroit.</div>
        <div style={s.sectionSub}>Des solutions bancaires pensées pour les particuliers et les entreprises de la région parisienne.</div>
        <div style={s.servicesGrid}>
          {services.map(sv => (
            <div key={sv.name} style={s.serviceCard}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 16px 48px rgba(10,22,40,0.08)'; e.currentTarget.style.borderColor='var(--gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; e.currentTarget.style.borderColor='#E8E2D6'; }}>
              <div style={s.serviceIcon}><i className={`ti ${sv.icon}`}/></div>
              <div style={s.serviceName}>{sv.name}</div>
              <div style={s.serviceDesc}>{sv.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section style={s.how} id="comment">
        <div style={s.sectionTag}>Processus</div>
        <div style={s.sectionTitle}>Ouvert en 4 étapes simples.</div>
        <div style={s.stepsGrid}>
          {steps.map(st => (
            <div key={st.num} style={s.step}>
              <div style={s.stepNum}>{st.num}</div>
              <div style={s.stepTitle}>{st.title}</div>
              <div style={s.stepDesc}>{st.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={s.testimonials} id="temoignages">
        <div style={s.sectionTag}>Témoignages</div>
        <div style={s.sectionTitle}>Ils nous font confiance.</div>
        <div style={s.testimonialGrid}>
          {testimonials.map(t => (
            <div key={t.author} style={s.testimonialCard}>
              <div style={{ color:'var(--gold)', fontSize:13, marginBottom:12 }}>★★★★★</div>
              <div style={s.testimonialText}>{t.text}</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:t.color, color:t.textColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600 }}>{t.initials}</div>
                <div><div style={s.authorName}>{t.author}</div><div style={s.authorRole}>{t.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={s.cta} id="contact">
        <h2 style={s.ctaH2}>Prêt à rejoindre <span style={{ color:'var(--gold)' }}>OJADA BANK</span> ?</h2>
        <p style={s.ctaP}>Ouvrez votre compte aujourd'hui et bénéficiez de tous nos services bancaires sans frais d'ouverture.</p>
        <div style={s.ctaActions}>
          <button style={s.btnHeroPrimary} onClick={() => openModal('client','register')}>Ouvrir mon compte</button>
          <button style={s.btnHeroSecondary}>Nous contacter</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerGrid}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ ...s.navLogoIcon, width:30, height:30, fontSize:12 }}>OJ</div>
              <span style={{ ...s.navLogoText, fontSize:16 }}>OJADA BANK</span>
            </div>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', lineHeight:1.7, maxWidth:240, fontWeight:300 }}>Votre partenaire bancaire de confiance à Villejuif et dans le Val-de-Marne.</p>
          </div>
          {[['Services',['Compte courant','Compte épargne','Compte entreprise','Virements']],['La banque',['À propos','Notre équipe','Carrières','Contact']],['Légal',['Conditions générales','Confidentialité','Mentions légales']]].map(([title, links]) => (
            <div key={title}>
              <div style={s.footerColTitle}>{title}</div>
              {links.map(l => <span key={l} style={{ ...s.footerLink, display:'block' }}>{l}</span>)}
            </div>
          ))}
        </div>
        <div style={s.footerBottom}>
          <span style={s.footerBottomText}>© 2026 OJADA BANK. Tous droits réservés. Villejuif, France.</span>
          <span style={s.footerBottomText}>Établissement agréé · ACPR · Banque de France</span>
        </div>
      </footer>

      {/* MODAL */}
      {modal && (
        <div style={s.overlay} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <button style={s.modalClose} onClick={() => setModal(false)}>✕</button>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <div style={{ ...s.navLogoIcon, background:'var(--navy)', color:'var(--gold)', width:30, height:30, fontSize:12 }}>OJ</div>
              <span style={{ fontFamily:'var(--serif)', fontSize:16, fontWeight:600, color:'var(--navy)' }}>OJADA BANK</span>
            </div>

            {/* Role switch — only for login */}
            {view === 'login' && (
              <div style={s.roleSwitch}>
                {['client','admin'].map(r => (
                  <button key={r} style={{ ...s.roleBtn, ...(role===r ? s.roleBtnActive : {}) }} onClick={() => setRole(r)}>
                    {r==='client' ? 'Espace client' : 'Administration'}
                  </button>
                ))}
              </div>
            )}

            {view === 'login' && role === 'client' && <LoginForm onSuccess={handleSuccess} onForgot={() => setView('forgot')} onRegister={() => setView('register')}/>}
            {view === 'login' && role === 'admin' && <AdminLoginForm onSuccess={handleSuccess}/>}
            {view === 'register' && <RegisterForm onSuccess={handleSuccess} onLogin={() => setView('login')}/>}
            {view === 'forgot' && <ForgotForm onBack={() => setView('login')}/>}
          </div>
        </div>
      )}
    </div>
  );
}
