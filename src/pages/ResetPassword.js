import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';

const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--navy)', padding:16 },
  card: { background:'var(--cream)', borderRadius:16, padding:'36px 32px', width:'100%', maxWidth:420, border:'1px solid #E8E2D6' },
  logoArea: { display:'flex', alignItems:'center', gap:10, marginBottom:24 },
  logoIcon: { width:34, height:34, background:'var(--navy)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--serif)', fontWeight:700, fontSize:14, color:'var(--gold)' },
  logoText: { fontFamily:'var(--serif)', fontSize:18, fontWeight:600, color:'var(--navy)' },
  title: { fontFamily:'var(--serif)', fontSize:24, color:'var(--navy)', marginBottom:6 },
  sub: { fontSize:13, color:'var(--text2)', marginBottom:24 },
  formGroup: { marginBottom:14 },
  label: { fontSize:11, color:'var(--text2)', marginBottom:5, display:'block' },
  input: { width:'100%', height:40, border:'1px solid #D8D2C6', borderRadius:7, padding:'0 12px', fontSize:13, color:'var(--text)', background:'#fff', outline:'none', fontFamily:'var(--sans)' },
  btn: { width:'100%', height:42, background:'var(--navy)', border:'none', borderRadius:7, fontSize:13, color:'#fff', cursor:'pointer', fontWeight:500, fontFamily:'var(--sans)', marginTop:4 },
  error: { background:'#FCEBEB', border:'1px solid #F7C1C1', borderRadius:7, padding:'10px 14px', fontSize:12, color:'#A32D2D', marginBottom:14 },
  success: { background:'#EAF3DE', border:'1px solid #C0DD97', borderRadius:7, padding:'10px 14px', fontSize:12, color:'#3B6D11', marginBottom:14 },
};

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [tokenValid, setTokenValid] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    authService.verifyResetToken(token)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) return setError('Les mots de passe ne correspondent pas.');
    if (newPassword.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (!/[A-Z]/.test(newPassword)) return setError('Le mot de passe doit contenir au moins une majuscule.');
    if (!/[0-9]/.test(newPassword)) return setError('Le mot de passe doit contenir au moins un chiffre.');
    setLoading(true);
    try {
      await authService.resetPassword({ token, new_password: newPassword });
      setSuccess('Mot de passe réinitialisé ! Redirection...');
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setError(err.message || 'Erreur. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoArea}>
          <div style={s.logoIcon}>OJ</div>
          <span style={s.logoText}>OJADA BANK</span>
        </div>

        {tokenValid === null && (
          <p style={{ fontSize:13, color:'var(--text2)' }}>Vérification du lien...</p>
        )}

        {tokenValid === false && (
          <>
            <h3 style={s.title}>Lien invalide</h3>
            <div style={s.error}>Ce lien de réinitialisation est invalide ou a expiré.</div>
            <button style={s.btn} onClick={() => navigate('/')}>Retour à l'accueil</button>
          </>
        )}

        {tokenValid === true && (
          <>
            <h3 style={s.title}>Nouveau mot de passe</h3>
            <p style={s.sub}>Choisissez un nouveau mot de passe sécurisé.</p>
            {error && <div style={s.error}>{error}</div>}
            {success && <div style={s.success}>{success}</div>}
            {!success && (
              <form onSubmit={handleSubmit}>
                <div style={s.formGroup}>
                  <label style={s.label}>Nouveau mot de passe</label>
                  <input style={s.input} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre" required/>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Confirmer le mot de passe</label>
                  <input style={s.input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Répétez le mot de passe" required/>
                </div>
                <button style={s.btn} type="submit" disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
