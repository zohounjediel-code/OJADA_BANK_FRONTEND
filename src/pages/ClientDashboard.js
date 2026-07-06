import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { clientService } from '../services/api';

const c = {
  card: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)' },
  cardHd: { padding:'13px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'center' },
  cardTitle: { fontSize:13, fontWeight:500, color:'var(--text)' },
  cardLink: { fontSize:11, color:'#185FA5', cursor:'pointer' },
  cardBd: { padding:'12px 16px' },
  txnRow: { display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' },
  txnIc: { width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 },
  badge: { fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500, display:'inline-block' },
  field: { display:'flex', flexDirection:'column', gap:5, marginBottom:14 },
  label: { fontSize:11, color:'var(--text2)' },
  input: { height:38, border:'1px solid var(--border)', borderRadius:8, padding:'0 12px', fontSize:13, fontFamily:'var(--sans)', color:'var(--text)', background:'var(--bg)', outline:'none' },
  select: { height:38, border:'1px solid var(--border)', borderRadius:8, padding:'0 12px', fontSize:13, fontFamily:'var(--sans)', color:'var(--text)', background:'var(--bg)', outline:'none' },
  submitBtn: { height:40, background:'var(--navy)', border:'none', borderRadius:8, fontSize:13, fontFamily:'var(--sans)', color:'#fff', cursor:'pointer', fontWeight:500, width:'100%' },
  submitGold: { height:40, background:'var(--gold)', border:'none', borderRadius:8, fontSize:13, fontFamily:'var(--sans)', color:'var(--navy)', cursor:'pointer', fontWeight:500, width:'100%' },
  skeleton: { background:'linear-gradient(90deg,var(--bg) 25%,var(--border) 50%,var(--bg) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', borderRadius:6, height:14 },
};

const navItems = [
  { section:'Mon espace' },
  { id:'accueil', icon:'ti-home', label:'Accueil' },
  { id:'comptes', icon:'ti-credit-card', label:'Mes comptes' },
  { id:'transactions', icon:'ti-arrows-exchange', label:'Transactions' },
  { section:'Services' },
  { id:'virement', icon:'ti-send', label:'Virement' },
  { id:'depot', icon:'ti-arrow-down-circle', label:'Dépôt' },
  { id:'retrait', icon:'ti-arrow-up-circle', label:'Retrait' },
  { section:'Compte' },
  { id:'notifications', icon:'ti-bell', label:'Notifications' },
  { id:'profil', icon:'ti-user-circle', label:'Mon profil' },
];

const typeStyle = {
  depot:    { bg:'#E6F1FB', color:'#185FA5', icon:'ti-arrow-down-left',  amountColor:'#3B6D11', label:'Dépôt' },
  virement: { bg:'#FAEEDA', color:'#854F0B', icon:'ti-arrows-exchange',  amountColor:'#3B6D11', label:'Virement' },
  retrait:  { bg:'#FCEBEB', color:'#A32D2D', icon:'ti-arrow-up-right',   amountColor:'#A32D2D', label:'Retrait' },
};

const notifTypeStyle = {
  bienvenue: { bg:'#EAF3DE', color:'#3B6D11', icon:'ti-confetti' },
  depot:     { bg:'#E6F1FB', color:'#185FA5', icon:'ti-arrow-down-left' },
  retrait:   { bg:'#FCEBEB', color:'#A32D2D', icon:'ti-arrow-up-right' },
  virement:  { bg:'#FAEEDA', color:'#854F0B', icon:'ti-arrows-exchange' },
  alerte:    { bg:'#FCEBEB', color:'#A32D2D', icon:'ti-alert-triangle' },
  info:      { bg:'#F1EFE8', color:'#5F5E5A', icon:'ti-info-circle' },
};

// Un virement est sortant (débit) si sa description commence par "Virement vers"
const isOutgoingVirement = (t) => t.type === 'virement' && (t.description || '').trim().toLowerCase().startsWith('virement vers');

// Style effectif d'une transaction (un virement sortant s'affiche comme un retrait : rouge, flèche sortante)
const getTxnStyle = (t) => {
  const base = typeStyle[t.type] || typeStyle.depot;
  if (isOutgoingVirement(t)) return { ...base, icon:'ti-arrow-up-right', amountColor:'#A32D2D' };
  return base;
};

// Formater un montant
const fmt = (amount, type, description) => {
  const n = Math.abs(amount).toLocaleString('fr-FR');
  const negative = type === 'retrait' || isOutgoingVirement({ type, description });
  return negative ? `-${n} €` : `+${n} €`;
};

// Formater une date
const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;

  // Comparaison sur le jour calendaire réel (et non sur le nombre d'heures écoulées),
  // pour qu'une transaction d'hier 23h ne s'affiche pas "Aujourd'hui" à 10h le lendemain.
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  if (dayDiff === 0) return `Aujourd'hui, ${d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`;
  if (dayDiff === 1) return `Hier, ${d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`;
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
};

// Composant ligne transaction
function TxnRow({ t, last }) {
  const ts = getTxnStyle(t);
  return (
    <div style={{ ...c.txnRow, borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ ...c.txnIc, background:ts.bg, color:ts.color }}><i className={`ti ${ts.icon}`}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.description || ts.label}</div>
        <div style={{ fontSize:10, color:'var(--text2)' }}>{fmtDate(t.created_at)}</div>
      </div>
      <div style={{ fontSize:13, fontWeight:500, color:ts.amountColor, flexShrink:0 }}>{fmt(t.amount, t.type, t.description)}</div>
    </div>
  );
}

// État vide
function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign:'center', padding:'28px 16px', color:'var(--text2)' }}>
      <i className={`ti ${icon}`} style={{ fontSize:32, opacity:0.3, display:'block', marginBottom:8 }}/>
      <div style={{ fontSize:12 }}>{message}</div>
    </div>
  );
}
function PageAccueil({ setPage, dashData, loading }) {
  const user = dashData?.user;
  const recentTxns = dashData?.recent_transactions || [];
  const monthStats = dashData?.month_stats || {};
  const balance = user?.balance ?? 0;
  const accountNum = user?.account_number || '—';

  return (
    <div style={{ animation:'fadeIn 0.35s ease' }}>
      {/* Balance Hero */}
      <div style={{ background:'linear-gradient(135deg,var(--navy) 0%,var(--navy3) 100%)', borderRadius:16, padding:'24px 20px', marginBottom:16, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:'50%', background:'radial-gradient(rgba(201,168,76,0.15),transparent 70%)' }}/>
        <div style={{ textAlign:'right', marginBottom:16, position:'relative' }}>
          <div style={{ fontSize:10, color:'rgba(201,168,76,0.5)', textTransform:'uppercase', letterSpacing:1 }}>{user?.account_type || 'Épargne'} · {accountNum.slice(-4)}</div>
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', marginBottom:4, position:'relative' }}>Solde disponible</div>
        <div style={{ fontFamily:'var(--serif)', fontSize:'clamp(30px,5vw,42px)', color:'#fff', fontWeight:600, marginBottom:4, position:'relative' }}>
          {loading ? <span style={{ opacity:0.4 }}>—</span> : balance.toLocaleString('fr-FR')}
          <span style={{ fontSize:'clamp(16px,2.5vw,20px)', color:'rgba(255,255,255,0.4)' }}> €</span>
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginBottom:22, position:'relative' }}>
          Ce mois : <span style={{ color:'#7BC67A' }}>+{(monthStats.total_depot || 0).toLocaleString('fr-FR')} € reçus</span>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', position:'relative' }}>
          {[['ti-send','Virement','virement'],['ti-arrow-down-circle','Dépôt','depot'],['ti-arrow-up-circle','Retrait','retrait']].map(([ic,lb,pg]) => (
            <button key={lb} onClick={() => setPage(pg)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--sans)', background: lb==='Virement' ? 'var(--gold)' : 'rgba(255,255,255,0.08)', color: lb==='Virement' ? 'var(--navy)' : 'rgba(255,255,255,0.75)', border: lb==='Virement' ? 'none' : '1px solid rgba(255,255,255,0.15)', transition:'all 0.2s' }}>
              <i className={`ti ${ic}`}/>{lb}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[['ti-send','Virement','#E6F1FB','#185FA5','virement'],['ti-arrow-down-circle','Dépôt','#EAF3DE','#3B6D11','depot'],['ti-arrow-up-circle','Retrait','#FCEBEB','#A32D2D','retrait'],['ti-receipt','Relevé','#FDF6E3','#854F0B','transactions']].map(([ic,lb,bg,col,pg]) => (
          <div key={lb} onClick={() => setPage(pg)} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 10px', textAlign:'center', cursor:'pointer', transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(10,22,40,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div style={{ width:40, height:40, borderRadius:11, background:bg, color:col, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, margin:'0 auto 8px' }}><i className={`ti ${ic}`}/></div>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--text)' }}>{lb}</div>
          </div>
        ))}
      </div>

      {/* 2-col grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:14 }}>
        <div style={c.card}>
          <div style={c.cardHd}><span style={c.cardTitle}>Dernières transactions</span><span style={c.cardLink} onClick={() => setPage('transactions')}>Voir tout →</span></div>
          <div style={c.cardBd}>
            {loading ? (
              [1,2,3].map(i => <div key={i} style={{ ...c.skeleton, marginBottom:12, height:40 }}/>)
            ) : recentTxns.length === 0 ? (
              <EmptyState icon="ti-arrows-exchange" message="Aucune transaction pour l'instant"/>
            ) : (
              recentTxns.map((t,i) => <TxnRow key={t.id} t={t} last={i===recentTxns.length-1}/>)
            )}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={c.card}>
            <div style={c.cardHd}><span style={c.cardTitle}>Infos du compte</span></div>
            <div style={c.cardBd}>
              {[
                ['Type', user?.account_type || 'Épargne'],
                ['Numéro', user?.account_number || '—'],
                ['Ouverture', user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—'],
                ['Statut', user?.status === 'active' ? 'Actif' : 'En attente']
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                  <span style={{ color:'var(--text2)' }}>{k}</span>
                  {k==='Statut'
                    ? <span style={{ ...c.badge, background: user?.status==='active' ? '#EAF3DE' : '#FAEEDA', color: user?.status==='active' ? '#3B6D11' : '#854F0B' }}>{v}</span>
                    : <span style={{ fontFamily: k==='Numéro' ? 'monospace' : undefined, fontSize: k==='Numéro' ? 11 : undefined }}>{v}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPOSANT GRAPHIQUE ACTIVITÉ MENSUELLE ───────────────────────
function MonthlyActivityChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/monthly-activity', {
      headers: { Authorization: `Bearer ${localStorage.getItem('ojada_token')}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setData(res.data);
        }
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{fontSize:12,color:'var(--text2)'}}>Chargement…</div>;
  if (data.length === 0) return <div style={{fontSize:12,color:'var(--text2)'}}>Aucune activité</div>;

  // Trouver le max pour échelonner les barres
  const maxTotal = Math.max(...data.map(d => d.total || 0), 1);
  
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:90, padding:'8px 0' }}>
      {data.map((item, idx) => {
        const [year, month] = item.month.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('fr-FR', { month:'short' });
        const height = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
        const isLast = idx === data.length - 1;
        return (
          <div key={item.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div 
              style={{ 
                width:'100%', 
                background: isLast ? 'var(--gold)' : '#F0D080', 
                borderRadius:'3px 3px 0 0', 
                height:`${Math.max(height, 5)}%`,
                cursor:'pointer',
                transition:'0.2s',
                opacity: 0.8
              }}
              title={`${monthName} : ${item.total.toLocaleString('fr-FR')} €`}
            />
            <span style={{ fontSize:10, color:'var(--text2)' }}>{monthName}</span>
          </div>
        );
      })}
    </div>
  );
}


function PageComptes({ user }) {
  return (
    <div style={{ animation:'fadeIn 0.35s ease' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:14, marginBottom:16 }}>
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy3))', borderRadius:16, padding:22, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:'50%', background:'radial-gradient(rgba(201,168,76,0.15),transparent 70%)' }}/>
          <div style={{ fontSize:10, color:'rgba(201,168,76,0.5)', textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>Compte épargne</div>
          <div style={{ fontFamily:'monospace', fontSize:12, color:'rgba(255,255,255,0.35)', letterSpacing:2, marginBottom:14 }}>OJ •••• •••• 4421</div>
          <div style={{ fontFamily:'var(--serif)', fontSize:'clamp(24px,4vw,30px)', color:'#fff', marginBottom:3 }}>{(user?.balance ?? 0).toLocaleString('fr-FR')} <span style={{ fontSize:14, color:'rgba(255,255,255,0.35)' }}>€</span></div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:16 }}>Solde disponible</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:1 }}>
              {user?.first_name?.[0] || ''}. {user?.last_name?.toUpperCase() || ''}
            </span>
            <span style={{ ...c.badge,
              background: user?.status==='active' ? '#EAF3DE' : '#FAEEDA',
              color:      user?.status==='active' ? '#3B6D11' : '#854F0B' }}>
              {user?.status==='active' ? 'Actif' : 'En attente'}
            </span>
          </div>
        </div>
        <div style={c.card}>
          <div style={c.cardBd}>
            <div style={{ fontSize:12, fontWeight:500, color:'var(--text)', marginBottom:14 }}>Détails du compte</div>
            {[['Type', user?.account_type || 'Épargne'],['Numéro', user?.account_number || '—'],['Ouverture', user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'],['Taux d\'intérêt','3,5% / an'],['Prochains intérêts', (() => {
                const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
                return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
              })()],['Statut', user?.status === 'active' ? 'Actif' : 'En attente']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                <span style={{ color:'var(--text2)' }}>{k}</span>
                {k==='Taux d\'intérêt' ? <span style={{ color:'#3B6D11', fontWeight:500 }}>{v}</span> : k==='Statut' ? <span style={{ ...c.badge, background:'#EAF3DE', color:'#3B6D11' }}>{v}</span> : <span style={{ fontFamily: k==='Numéro'?'monospace':undefined, fontSize: k==='Numéro'?11:undefined }}>{v}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={c.card}>
        <div style={c.cardHd}><span style={c.cardTitle}>Activité — 5 derniers mois</span></div>
        <div style={c.cardBd}>
          <MonthlyActivityChart/>
        </div>
      </div>

      {/* ── Informations bancaires IBAN / BIC ── */}
      <div style={{ ...c.card, marginTop:14 }}>
        <div style={c.cardHd}><span style={c.cardTitle}>Informations bancaires</span></div>
        <div style={c.cardBd}>
          {user?.client_iban ? (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text2)' }}>IBAN</span>
                <span style={{ fontSize:12, fontFamily:'monospace', fontWeight:600, letterSpacing:1, color:'var(--navy)' }}>
                  {user.client_iban.replace(/(.{4})/g, '$1 ').trim()}
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text2)' }}>BIC / SWIFT</span>
                <span style={{ fontSize:12, fontFamily:'monospace', fontWeight:600, color:'var(--navy)' }}>{user.client_bic}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text2)' }}>Titulaire</span>
                <span style={{ fontSize:12, fontWeight:500 }}>{user.first_name} {user.last_name}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0' }}>
                <span style={{ fontSize:12, color:'var(--text2)' }}>Banque</span>
                <span style={{ fontSize:12, fontWeight:500 }}>OJADA BANK</span>
              </div>
              <div style={{ marginTop:10, background:'#EAF3DE', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#3B6D11', display:'flex', gap:6 }}>
                <i className="ti ti-info-circle" style={{ flexShrink:0, marginTop:1 }}/>
                <span>Utilisez ces coordonnées pour recevoir des virements SEPA depuis une banque externe.</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:20 }}>
              <i className="ti ti-building-bank" style={{ fontSize:32, color:'var(--text2)', opacity:0.3, display:'block', marginBottom:8 }}/>
              <div style={{ fontSize:12, color:'var(--text2)' }}>Vos coordonnées bancaires seront disponibles après activation de votre compte par notre équipe.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageTransactions() {
  const [filter, setFilter] = useState('tous');
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await clientService.getTransactions(filter === 'tous' ? '' : filter);
        setTxns(res.data.transactions);
      } catch(e) { setTxns([]); }
      setLoading(false);
    };
    load();
  }, [filter]);

  return (
    <div style={{ animation:'fadeIn 0.35s ease' }}>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {['tous','depot','retrait','virement'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontSize:11, padding:'5px 14px', borderRadius:20, cursor:'pointer', border:'1px solid var(--border)', background: filter===f ? 'var(--navy)' : 'transparent', color: filter===f ? '#fff' : 'var(--text2)', transition:'all 0.15s', fontFamily:'var(--sans)' }}>
            {f==='tous'?'Toutes':f==='depot'?'Dépôts':f==='retrait'?'Retraits':'Virements'}
          </button>
        ))}
      </div>
      <div style={c.card}>
        {loading ? (
          <div style={{ padding:16 }}>{[1,2,3,4].map(i => <div key={i} style={{ ...c.skeleton, marginBottom:12, height:36 }}/>)}</div>
        ) : txns.length === 0 ? (
          <EmptyState icon="ti-receipt" message="Aucune transaction pour l'instant"/>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>{['Référence','Description','Type','Montant','Date','Statut'].map(h => (
                  <th key={h} style={{ textAlign:'left', fontSize:10, color:'var(--text2)', fontWeight:500, padding:'7px 12px', borderBottom:'1px solid var(--border)', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {txns.map((t,i) => {
                  const ts = getTxnStyle(t);
                  return (
                    <tr key={t.id} style={{ backgroundColor: i%2===0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:'var(--text2)', whiteSpace:'nowrap' }}>{t.reference}</td>
                      <td style={{ padding:'9px 12px' }}>{t.description || ts.label}</td>
                      <td style={{ padding:'9px 12px' }}><span style={{ ...c.badge, background:ts.bg, color:ts.color }}>{ts.label}</span></td>
                      <td style={{ padding:'9px 12px', fontWeight:500, color:ts.amountColor, whiteSpace:'nowrap' }}>{fmt(t.amount, t.type, t.description)}</td>
                      <td style={{ padding:'9px 12px', color:'var(--text2)', fontSize:11, whiteSpace:'nowrap' }}>{fmtDate(t.created_at)}</td>
                      <td style={{ padding:'9px 12px' }}><span style={{ ...c.badge, background: t.status==='valide'?'#EAF3DE':'#FAEEDA', color: t.status==='valide'?'#3B6D11':'#854F0B' }}>{t.status==='valide'?'Validé':'En attente'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Catégories de compte
const ACCOUNT_CATEGORIES = {
  basic:        { label:'Basic',        bg:'#f0f0f0', col:'#555',    icon:'ti-circle' },
  basic_plus:   { label:'Basic Plus',   bg:'#e8f4fd', col:'#185FA5', icon:'ti-circle-plus' },
  premium:      { label:'Premium',      bg:'#FAEEDA', col:'#854F0B', icon:'ti-diamond' },
  premium_plus: { label:'Premium Plus', bg:'#f5e6fa', col:'#7a1fa8', icon:'ti-diamond-filled' },
  vip:          { label:'VIP',          bg:'#EAF3DE', col:'#3B6D11', icon:'ti-crown' },
  vip_plus:     { label:'VIP Plus',     bg:'#0a1628', col:'#c9a84c', icon:'ti-crown-filled' },
};
const getCat = (v) => ACCOUNT_CATEGORIES[v] || ACCOUNT_CATEGORIES.basic;

function PageVirement({ user }) {
  const [accountNumber, setAccountNumber] = useState('');
  const [receiverInfo, setReceiverInfo]   = useState(null);
  const [lookupStatus, setLookupStatus]   = useState('idle'); // idle | loading | found | notfound
  const [amount, setAmount]               = useState('');
  const [motif, setMotif]                 = useState('');
  const [submitStatus, setSubmitStatus]   = useState('idle'); // idle | loading | success | error
  const [submitMsg, setSubmitMsg]         = useState('');
  const [newBalance, setNewBalance]       = useState(null);

  // Recherche en temps réel du destinataire (debounce 600ms)
  useEffect(() => {
    if (accountNumber.trim().length < 5) {
      setReceiverInfo(null);
      setLookupStatus('idle');
      return;
    }
    setLookupStatus('loading');
    const timer = setTimeout(async () => {
      try {
        const res = await clientService.lookupAccount(accountNumber.trim());
        if (res.success) { setReceiverInfo(res.data); setLookupStatus('found'); }
        else { setReceiverInfo(null); setLookupStatus('notfound'); }
      } catch { setReceiverInfo(null); setLookupStatus('notfound'); }
    }, 600);
    return () => clearTimeout(timer);
  }, [accountNumber]);

  const handleSubmit = async () => {
    if (!receiverInfo) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setSubmitMsg('Veuillez saisir un montant valide.'); setSubmitStatus('error'); return; }
    if (user && amt > user.balance) { setSubmitMsg('Solde insuffisant.'); setSubmitStatus('error'); return; }
    setSubmitStatus('loading'); setSubmitMsg('');
    try {
      const res = await clientService.transfer({ account_number: accountNumber.trim(), amount: amt, motif: motif.trim() || undefined });
      if (res.success) {
        setSubmitStatus('success');
        setSubmitMsg(`Virement de ${amt.toLocaleString('fr-FR')} € envoyé à ${receiverInfo.name} avec succès.`);
        setNewBalance(res.data?.new_balance ?? null);
        setAccountNumber(''); setAmount(''); setMotif(''); setReceiverInfo(null); setLookupStatus('idle');
      } else { setSubmitStatus('error'); setSubmitMsg(res.message || 'Erreur lors du virement.'); }
    } catch (err) { setSubmitStatus('error'); setSubmitMsg(err.message || 'Erreur serveur. Réessayez.'); }
  };

  const balance = user?.balance ?? 0;
  const amt     = parseFloat(amount) || 0;
  const canSend = lookupStatus === 'found' && amt > 0 && amt <= balance && submitStatus !== 'loading';

  return (
    <div style={{ maxWidth:480, animation:'fadeIn 0.35s ease' }}>

      {submitStatus === 'success' && (
        <div style={{ background:'#EAF3DE', border:'1px solid #B6D99B', borderRadius:10, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'flex-start', gap:10 }}>
          <i className="ti ti-circle-check" style={{ color:'#3B6D11', fontSize:18, flexShrink:0, marginTop:1 }}/>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#3B6D11', marginBottom:2 }}>Virement effectué</div>
            <div style={{ fontSize:12, color:'#3B6D11' }}>{submitMsg}</div>
            {newBalance !== null && (
              <div style={{ fontSize:11, color:'#5a8c2f', marginTop:4 }}>
                Nouveau solde : <strong>{newBalance.toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ ...c.card, marginBottom:14 }}>
        <div style={c.cardHd}><span style={c.cardTitle}>Nouveau virement</span></div>
        <div style={c.cardBd}>

          <div style={{ background:'var(--bg)', borderRadius:8, padding:'8px 12px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text2)' }}>Solde disponible</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>{balance.toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</span>
          </div>

          <div style={c.field}>
            <label style={c.label}>Numéro de compte destinataire</label>
            <div style={{ position:'relative' }}>
              <input
                style={{ ...c.input, width:'100%', boxSizing:'border-box', paddingRight:36,
                  borderColor: lookupStatus==='found' ? '#3B6D11' : lookupStatus==='notfound' ? '#A32D2D' : 'var(--border)' }}
                placeholder="Ex : OJ-2025-0042"
                value={accountNumber}
                onChange={e => { setAccountNumber(e.target.value); setSubmitStatus('idle'); }}
              />
              <div style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:15 }}>
                {lookupStatus==='loading'  && <i className="ti ti-loader-2" style={{ color:'var(--text2)', animation:'spin 1s linear infinite' }}/>}
                {lookupStatus==='found'    && <i className="ti ti-circle-check" style={{ color:'#3B6D11' }}/>}
                {lookupStatus==='notfound' && <i className="ti ti-circle-x" style={{ color:'#A32D2D' }}/>}
              </div>
            </div>
            {lookupStatus==='found' && receiverInfo && (
              <div style={{ fontSize:11, color:'#3B6D11', display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <i className="ti ti-user-check"/>
                <span><strong>{receiverInfo.name}</strong> — {receiverInfo.account_number}</span>
              </div>
            )}
            {lookupStatus==='notfound' && (
              <div style={{ fontSize:11, color:'#A32D2D', display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <i className="ti ti-alert-circle"/>
                <span>Aucun compte actif trouvé avec ce numéro.</span>
              </div>
            )}
          </div>

          <div style={c.field}>
            <label style={c.label}>Montant (€)</label>
            <input
              style={{ ...c.input, borderColor: amt > balance ? '#A32D2D' : 'var(--border)' }}
              type="number" min="1" placeholder="0"
              value={amount}
              onChange={e => { setAmount(e.target.value); setSubmitStatus('idle'); }}
            />
            {amt > 0 && amt <= balance && (
              <div style={{ fontSize:11, color:'var(--text2)' }}>
                Solde après virement : <strong>{(balance - amt).toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</strong>
              </div>
            )}
            {amt > balance && <div style={{ fontSize:11, color:'#A32D2D' }}>Montant supérieur à votre solde disponible.</div>}
          </div>

          <div style={c.field}>
            <label style={c.label}>Motif (optionnel)</label>
            <input style={c.input} placeholder="Ex : Remboursement, loyer..." value={motif} onChange={e => setMotif(e.target.value)}/>
          </div>

          {submitStatus==='error' && (
            <div style={{ fontSize:12, color:'#A32D2D', background:'#FCEBEB', borderRadius:8, padding:'8px 12px', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-alert-triangle"/>{submitMsg}
            </div>
          )}

          <button
            style={{ ...c.submitGold, opacity: canSend ? 1 : 0.5, cursor: canSend ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
            onClick={handleSubmit}
            disabled={!canSend}
          >
            {submitStatus==='loading'
              ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }}/>Envoi en cours…</>
              : <><i className="ti ti-send"/>Confirmer le virement</>}
          </button>

        </div>
      </div>

      <div style={c.card}>
        <div style={c.cardBd}>
          <div style={{ fontSize:12, color:'var(--text2)', display:'flex', gap:8 }}>
            <i className="ti ti-info-circle" style={{ color:'var(--gold)', flexShrink:0, marginTop:1 }}/>
            <span>Les virements entre clients OJADA BANK sont instantanés et sans frais. Pour un virement externe (SEPA), contactez votre agence.</span>
          </div>
        </div>
      </div>

    </div>
  );
}

function PageDepot({ user }) {
  const balance = Number(user?.balance ?? 0);
  const accountNum = user?.account_number || '—';

  return (
    <div style={{ maxWidth:520, animation:'fadeIn 0.35s ease' }}>

      {/* Bannière principale */}
      <div style={{ background:'var(--navy)', borderRadius:14, padding:'28px 24px', marginBottom:16, textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(201,168,76,0.08)' }}/>
        <div style={{ position:'absolute', bottom:-30, left:-20, width:90, height:90, borderRadius:'50%', background:'rgba(201,168,76,0.06)' }}/>
        <i className="ti ti-building-bank" style={{ fontSize:38, color:'var(--gold)', display:'block', marginBottom:12 }}/>
        <div style={{ fontFamily:'var(--serif)', fontSize:20, color:'#fff', marginBottom:8 }}>Dépôts physiques uniquement</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.7, maxWidth:360, margin:'0 auto' }}>
          Pour garantir la sécurité maximale de vos fonds, <strong style={{ color:'var(--gold)' }}>OJADA BANK</strong> a fait le choix de n'accepter que les dépôts physiques effectués directement en agence.
        </div>
      </div>

      {/* Pourquoi ce choix */}
      <div style={{ ...c.card, marginBottom:14 }}>
        <div style={c.cardHd}><span style={c.cardTitle}>Pourquoi ce choix ?</span></div>
        <div style={c.cardBd}>
          {[
            ['ti-shield-lock',  'Sécurité renforcée',      'Les dépôts physiques éliminent tout risque de fraude en ligne ou d\'interception de fonds.'],
            ['ti-eye-check',    'Traçabilité totale',       'Chaque dépôt est enregistré, horodaté et validé par un conseiller en agence.'],
            ['ti-user-check',   'Relation de confiance',    'Votre conseiller OJADA BANK vérifie votre identité à chaque opération pour vous protéger.'],
            ['ti-certificate',  'Conformité réglementaire', 'Cette procédure est conforme aux exigences de l\'ACPR et aux normes anti-blanchiment.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:36, height:36, borderRadius:9, background:'#FAEEDA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={"ti " + icon} style={{ color:'var(--gold)', fontSize:16 }}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--navy)', marginBottom:2 }}>{title}</div>
                <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:12, padding:'10px 0' }}>
            <div style={{ width:36, height:36, borderRadius:9, background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="ti ti-clock" style={{ color:'#3B6D11', fontSize:16 }}/>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--navy)', marginBottom:2 }}>Crédit immédiat</div>
              <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>Votre solde est crédité instantanément après validation par le conseiller en agence.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Infos compte */}
      <div style={{ ...c.card, marginBottom:14 }}>
        <div style={c.cardHd}><span style={c.cardTitle}>Vos informations de compte</span></div>
        <div style={c.cardBd}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:12, color:'var(--text2)' }}>Numéro de compte</span>
            <span style={{ fontSize:12, fontFamily:'monospace', fontWeight:600 }}>{accountNum}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:12, color:'var(--text2)' }}>Titulaire</span>
            <span style={{ fontSize:12, fontWeight:600 }}>{user?.first_name} {user?.last_name}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0' }}>
            <span style={{ fontSize:12, color:'var(--text2)' }}>Solde actuel</span>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--navy)' }}>{balance.toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</span>
          </div>
        </div>
      </div>

      {/* Comment faire un dépôt */}
      <div style={c.card}>
        <div style={c.cardHd}><span style={c.cardTitle}>Comment effectuer un dépôt ?</span></div>
        <div style={c.cardBd}>
          {[
            ['1', 'Rendez-vous en agence', 'Présentez-vous à votre agence OJADA BANK aux heures d’ouverture.'],
            ['2', 'Munissez-vous de vos documents', 'Apportez une pièce d\'identité valide et votre numéro de compte : ' + accountNum],
            ['3', 'Remettez vos fonds', 'Confiez votre dépôt (espèces ou chèque) à votre conseiller.'],
            ['4', 'Votre compte est crédité', 'Le montant apparaît instantanément sur votre solde après validation.'],
          ].map(([num, title, desc]) => (
            <div key={num} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: num!=='4'?'1px solid var(--border)':'none' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--navy)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{num}</div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--navy)', marginBottom:2 }}>{title}</div>
                <div style={{ fontSize:11, color:'var(--text2)', lineHeight:1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Composant champ de formulaire — défini HORS de PageRetrait pour éviter la perte de focus au re-render
function RetraitFld({ label, fieldKey, placeholder, type, half, value, error, onChange }) {
  return (
    <div style={{...c.field,...(half?{width:'calc(50% - 4px)'}:{})}}>
      <label style={c.label}>{label}</label>
      <input
        style={{...c.input, borderColor: error ? '#A32D2D' : 'var(--border)'}}
        type={type || 'text'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      {error && <div style={{fontSize:10, color:'#A32D2D'}}>{error}</div>}
    </div>
  );
}

function PageRetrait({ user }) {
  const FEES_BY_CAT_CLIENT = {
    basic_moins:  [250, 380, 425, 610, 795, 1300],
    basic:        [410, 825, 1270, 2830, 4125, 5348],
    basic_plus:   [490, 1500, 3210, 2630, 4925, 5500],
    premium:      [520, 1800, 3270, 6830, 2125, 7348],
    premium_plus: [820, 2850, 4800, 6930, 8125, 9248],
    vip:          [930, 3800, 5200, 7616, 8800, 9500],
    vip_plus:     [1345, 4170, 6790, 9616, 10807, 13066],
  };
  const FEE_ICONS = ["ti-credit-card","ti-refresh","ti-license","ti-arrows-exchange","ti-toggle-right","ti-id-badge"];
  const FEE_NAMES_C = ["Frais de vérification de carte","Frais de synchronisation de carte","Frais d'achat de licence d'envoi","Frais de virement externe","Frais d'activation du compte","Frais de vérification d'identité"];
  const userCat = user?.account_category || 'basic';
  const FEE_LEVELS = (FEES_BY_CAT_CLIENT[userCat] || FEES_BY_CAT_CLIENT.basic).map((amount, i) => ({ level:i, name:FEE_NAMES_C[i], amount, icon:FEE_ICONS[i] }));

  const [step, setStep]             = useState(1); // 1=montant, 2=coords, 3=soumis (gestion frais)
  const [amount, setAmount]         = useState('');
  const [motif, setMotif]           = useState('');
  const [form, setForm]             = useState({
    first_name: user?.first_name||'', last_name: user?.last_name||'', phone: user?.phone||'',
    address: user?.address||'', postal_code: user?.postal_code||'',
    city: user?.city||'', bank_name:'', iban:'', card_number:'', cvv:'', card_expiry:'',
  });
  const [errors, setErrors]         = useState({});
  const [submitStatus, setSubmitStatus] = useState('idle');
  const [submitMsg, setSubmitMsg]   = useState('');
  const [activeWR, setActiveWR]     = useState(null); // demande en cours
  const [history, setHistory]       = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [confirmingFee, setConfirmingFee] = useState(false);
  const [feeConfirmed, setFeeConfirmed]   = useState(false);
  const [showCardChange, setShowCardChange] = useState(false);
  const [cardChangeForm, setCardChangeForm] = useState({ first_name:'', last_name:'', phone:'', address:'', postal_code:'', city:'', bank_name:'', iban:'', card_number:'', cvv:'', card_expiry:'' });
  const [cardChangeStatus, setCardChangeStatus] = useState('idle');
  const [cardChangeMsg, setCardChangeMsg]   = useState('');
  const [identityFile, setIdentityFile]         = useState(null);
  const [identityFileVerso, setIdentityFileVerso] = useState(null);
  const [idFileError, setIdFileError]     = useState('');
  const [showInstallment, setShowInstallment] = useState(false);
  const [installmentAmt, setInstallmentAmt]   = useState('');
  const [installmentStatus, setInstallmentStatus] = useState('idle');

  const balance = Number(user?.balance ?? 0);
  const amt     = parseFloat(amount) || 0;

  const loadHistory = async () => {
    setLoadingHist(true);
    try {
      const r = await clientService.getWithdrawals();
      const list = r.data || [];
      setHistory(list);
      // Trouver la demande active (non terminée)
      const active = list.find(w => !['approved','rejected'].includes(w.status));
      setActiveWR(active || null);
      if (active) setStep(3);
    } catch { setHistory([]); }
    setLoadingHist(false);
  };

  useEffect(() => { loadHistory(); }, []);

  const setF = (k,v) => setForm(f => ({...f,[k]:v}));

  const validateStep1 = () => {
    if (!amt || amt<=0) return 'Veuillez saisir un montant valide.';
    if (amt>balance) return 'Montant supérieur à votre solde disponible.';
    return null;
  };

  const validateStep2 = () => {
    const e={};
    if (!form.first_name.trim()) e.first_name='Requis';
    if (!form.last_name.trim())  e.last_name='Requis';
    if (!form.phone.trim())      e.phone='Requis';
    else if (!/^[\d\s+().-]{8,20}$/.test(form.phone.trim())) e.phone='Numéro invalide';
    if (!form.address.trim())    e.address='Requis';
    if (!form.postal_code.trim()) e.postal_code='Requis';
    if (!form.city.trim())       e.city='Requis';
    if (!form.bank_name.trim())  e.bank_name='Requis';
    if (!form.iban.trim() || !/^[A-Z0-9]{15,34}$/i.test(form.iban.replace(/\s/g,''))) e.iban='IBAN invalide';
    if (form.card_number && !/^\d{13,19}$/.test(form.card_number.replace(/\s/g,''))) e.card_number='Numéro de carte invalide';
    if (!/^\d{3,4}$/.test(form.cvv)) e.cvv='CVV invalide';
    if (!/^\d{2}\/\d{2}$/.test(form.card_expiry)) e.card_expiry='Format MM/AA';
    return Object.keys(e).length ? e : null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setSubmitMsg(err); setSubmitStatus('error'); return; }
    setSubmitMsg(''); setSubmitStatus('idle'); setStep(2);
  };

  const handleSubmit = async () => {
    const errs = validateStep2();
    if (errs) { setErrors(errs); return; }
    if (!identityFile) { setSubmitMsg("Veuillez joindre le recto de votre pièce d'identité."); setSubmitStatus('error'); return; }
    if (!identityFileVerso) { setSubmitMsg("Veuillez joindre le verso de votre pièce d'identité."); setSubmitStatus('error'); return; }
    setErrors({}); setSubmitStatus('loading');
    try {
      // 1. Uploader le recto de la pièce d'identité
      let identityUrl = null;
      const upRes = await clientService.uploadDocument(identityFile, 'identity_temp', null);
      if (upRes.success) identityUrl = upRes.url;

      // 2. Uploader le verso de la pièce d'identité
      let identityVersoUrl = null;
      const upResVerso = await clientService.uploadDocument(identityFileVerso, 'identity_verso_temp', null);
      if (upResVerso.success) identityVersoUrl = upResVerso.url;

      // 3. Soumettre la demande avec les deux URLs
      const res = await clientService.submitWithdrawal({
        amount:amt, motif:motif.trim()||undefined, ...form,
        iban:form.iban.replace(/\s/g,''), identity_doc: identityUrl, identity_doc_verso: identityVersoUrl
      });
      if (res.success) { setSubmitStatus('success'); await loadHistory(); }
      else { setSubmitStatus('error'); setSubmitMsg(res.message||'Erreur.'); }
    } catch(err) { setSubmitStatus('error'); setSubmitMsg(err.message||'Erreur serveur.'); }
  };

  const handleInstallment = async () => {
    if (!activeWR) return;
    const level   = parseInt(activeWR.status.replace('pending_fee_',''));
    const fee     = FEE_LEVELS[level];
    const feePaid = Number(activeWR.fee_paid || 0);
    const remaining = fee.amount - feePaid;
    const amt = parseFloat(installmentAmt);
    if (!amt || amt <= 0 || amt > remaining) return;
    setInstallmentStatus('loading');
    try {
      const res = await clientService.requestInstallment(activeWR.id, amt);
      if (res.success) {
        setShowInstallment(false);
        setInstallmentAmt('');
        setInstallmentStatus('idle');
        await loadHistory();
      } else {
        setInstallmentStatus('error');
      }
    } catch { setInstallmentStatus('error'); }
  };

  const handleConfirmFee = async () => {
    if (!activeWR) return;
    setConfirmingFee(true);
    try {
      // Si niveau 5, uploader la pièce d'identité d'abord
      const level = parseInt(activeWR.status.replace('pending_fee_',''));
      if (level === 5 && identityFile) {
        const uploadRes = await clientService.uploadDocument(identityFile, 'identity', activeWR.id);
        if (!uploadRes.success) {
          setConfirmingFee(false);
          return;
        }
      }
      const res = await clientService.confirmFeePayment(activeWR.id);
      if (res.success) { setFeeConfirmed(true); await loadHistory(); }
    } catch {}
    setConfirmingFee(false);
  };

  // ── Calcul statut courant ──
  const getFeeInfo = (wr) => {
    if (!wr) return null;
    const s = wr.status;
    if (s.startsWith('pending_fee_'))  { const l=parseInt(s.replace('pending_fee_','')); return { phase:'pending', level:l, fee:FEE_LEVELS[l] }; }
    if (s.startsWith('awaiting_fee_')) { const l=parseInt(s.replace('awaiting_fee_','')); return { phase:'awaiting', level:l, fee:FEE_LEVELS[l] }; }
    if (s==='awaiting_final')          return { phase:'awaiting_final', level:6, fee:null };
    if (s==='approved')                return { phase:'approved' };
    if (s==='rejected')                return { phase:'rejected' };
    return null;
  };

  const statusBadge = (s) => {
    const map = {
      approved:      ['#EAF3DE','#3B6D11','✅ Validé'],
      rejected:      ['#FCEBEB','#A32D2D','❌ Refusé'],
      awaiting_final:['#EAF3DE','#3B6D11','⏳ Validation finale'],
    };
    if (map[s]) { const [bg,col,lbl]=map[s]; return <span style={{background:bg,color:col,fontSize:10,fontWeight:600,borderRadius:5,padding:'2px 8px'}}>{lbl}</span>; }
    if (s.startsWith('pending_fee_')||s.startsWith('awaiting_fee_')) {
      const l = parseInt(s.replace(/pending_fee_|awaiting_fee_/,''));
      return <span style={{background:'#FAEEDA',color:'#854F0B',fontSize:10,fontWeight:600,borderRadius:5,padding:'2px 8px'}}>⏳ Étape {l+1}/6</span>;
    }
    return <span style={{background:'#f0f0f0',color:'#666',fontSize:10,fontWeight:600,borderRadius:5,padding:'2px 8px'}}>{s}</span>;
  };

  // ── Stepper visuel ──
  const Stepper = ({ currentLevel }) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:0,marginBottom:20,flexWrap:'wrap',gap:4}}>
      {FEE_LEVELS.map((f,i) => {
        const done    = i < currentLevel;
        const active  = i === currentLevel;
        const pending = i > currentLevel;
        return (
          <div key={i} style={{display:'flex',alignItems:'center'}}>
            <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,
              background: done?'#3B6D11':active?'var(--navy)':'#e8e2d6',
              color: done||active?'#fff':'#aaa', border: active?'2px solid var(--gold)':'none', flexShrink:0}}>
              {done ? '✓' : i+1}
            </div>
            {i<FEE_LEVELS.length-1 && <div style={{width:16,height:2,background:done?'#3B6D11':'#e8e2d6'}}/>}
          </div>
        );
      })}
    </div>
  );

  // ── STEP 3 : Gestion des frais ──
  if (step===3) {
    const fi = getFeeInfo(activeWR);
    if (!fi && !loadingHist) {
      return (
        <div style={{maxWidth:480,animation:'fadeIn 0.35s ease'}}>
          <div style={{...c.card,padding:24,textAlign:'center'}}>
            <i className="ti ti-check" style={{fontSize:40,color:'#3B6D11',marginBottom:8,display:'block'}}/>
            <div style={{fontSize:14,fontWeight:600,color:'var(--navy)'}}>Aucune demande active</div>
          </div>
          <button style={{...c.submitBtn,marginTop:12}} onClick={()=>setStep(1)}>Nouvelle demande</button>
        </div>
      );
    }
    if (!fi) return (<div style={{padding:20,color:'var(--text2)',fontSize:12}}>Chargement…</div>);

    // Approuvé final
    if (fi.phase==='approved') return (
      <div style={{maxWidth:480,animation:'fadeIn 0.35s ease'}}>
        <div style={{background:'#EAF3DE',border:'1px solid #B6D99B',borderRadius:12,padding:24,textAlign:'center',marginBottom:14}}>
          <i className="ti ti-circle-check" style={{fontSize:40,color:'#3B6D11',display:'block',marginBottom:8}}/>
          <div style={{fontSize:15,fontWeight:600,color:'#3B6D11',marginBottom:4}}>Retrait approuvé !</div>
          <div style={{fontSize:13,color:'#3B6D11'}}>Votre retrait de <strong>{Number(activeWR.amount).toLocaleString('fr-FR')} €</strong> a été effectué.</div>
        </div>
        <button style={c.submitBtn} onClick={()=>{setActiveWR(null);setStep(1);}}>Nouvelle demande</button>
      </div>
    );

    // Refusé
    if (fi.phase==='rejected') return (
      <div style={{maxWidth:480,animation:'fadeIn 0.35s ease'}}>
        <div style={{background:'#FCEBEB',border:'1px solid #f5c2c2',borderRadius:12,padding:24,textAlign:'center',marginBottom:14}}>
          <i className="ti ti-circle-x" style={{fontSize:40,color:'#A32D2D',display:'block',marginBottom:8}}/>
          <div style={{fontSize:15,fontWeight:600,color:'#A32D2D',marginBottom:4}}>Demande refusée</div>
          {activeWR?.admin_note && <div style={{fontSize:12,color:'#A32D2D'}}>Motif : {activeWR.admin_note}</div>}
        </div>
        <button style={c.submitBtn} onClick={()=>{setActiveWR(null);setStep(1);}}>Nouvelle demande</button>
      </div>
    );

    // Validation finale en attente
    if (fi.phase==='awaiting_final') return (
      <div style={{maxWidth:480,animation:'fadeIn 0.35s ease'}}>
        <Stepper currentLevel={6}/>
        <div style={{...c.card,padding:24,textAlign:'center'}}>
          <i className="ti ti-clock" style={{fontSize:36,color:'var(--gold)',display:'block',marginBottom:12}}/>
          <div style={{fontSize:14,fontWeight:600,color:'var(--navy)',marginBottom:6}}>Tous les frais ont été validés</div>
          <div style={{fontSize:12,color:'var(--text2)'}}>Votre retrait de <strong>{Number(activeWR.amount).toLocaleString('fr-FR')} €</strong> est en cours de validation finale par notre équipe.</div>
        </div>
      </div>
    );

    // En attente de confirmation admin
    if (fi.phase==='awaiting') return (
      <div style={{maxWidth:480,animation:'fadeIn 0.35s ease'}}>
        <Stepper currentLevel={fi.level}/>
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>Paiement en cours de vérification</span></div>
          <div style={c.cardBd}>
            <div style={{background:'#FAEEDA',borderRadius:9,padding:14,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,color:'#854F0B',marginBottom:4}}>⏳ Étape {fi.level+1}/6 — {fi.fee.name}</div>
              <div style={{fontSize:12,color:'#854F0B'}}>Votre paiement de <strong>{fi.fee.amount.toLocaleString('fr-FR')} €</strong> est en cours de vérification par notre équipe. Vous serez notifié dès validation.</div>
            </div>
            <div style={{fontSize:11,color:'var(--text2)',textAlign:'center'}}>Référence : <span style={{fontFamily:'monospace'}}>{activeWR.reference}</span></div>
          </div>
        </div>
      </div>
    );

    // pending_fee_X : afficher la page du frais courant
    const isIdentityLevel = false; // Piece identite deja fournie etape 2
    return (
      <div style={{maxWidth:480,animation:'fadeIn 0.35s ease'}}>
        <Stepper currentLevel={fi.level}/>
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>Étape {fi.level+1}/6 — {fi.fee.name}</span></div>
          <div style={c.cardBd}>
            {/* Montant du frais */}
            {(() => {
              const feePaid = Number(activeWR?.fee_paid || 0);
              const remaining = fi.fee.amount - feePaid;
              return (
                <div style={{background:'#FAEEDA',borderRadius:10,padding:20,textAlign:'center',marginBottom:16}}>
                  <div style={{fontSize:11,color:'#854F0B',marginBottom:4}}>{fi.fee.name}</div>
                  <div style={{fontSize:32,fontWeight:700,color:'#0a1628'}}>{remaining.toLocaleString('fr-FR')} €</div>
                  <div style={{fontSize:11,color:'#854F0B',marginTop:2}}>à régler pour débloquer votre retrait</div>
                  {feePaid > 0 && (
                    <div style={{marginTop:10,display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                      <div style={{fontSize:11,color:'#3B6D11',background:'rgba(59,109,17,0.12)',borderRadius:6,padding:'4px 12px',fontWeight:600}}>
                        ✓ Déjà payé : {feePaid.toLocaleString('fr-FR')} €
                      </div>
                      <div style={{fontSize:11,color:'#854F0B',background:'rgba(133,79,11,0.1)',borderRadius:6,padding:'4px 12px',fontWeight:600}}>
                        Reste : {remaining.toLocaleString('fr-FR')} €
                      </div>
                      <div style={{fontSize:11,color:'var(--text2)',background:'#f0f0f0',borderRadius:6,padding:'4px 12px'}}>
                        Total : {fi.fee.amount.toLocaleString('fr-FR')} €
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Message échec si applicable */}
            {activeWR?.admin_note && activeWR?.status?.startsWith('pending_fee_') && (
              <div style={{background:'#FCEBEB',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',gap:8,alignItems:'flex-start'}}>
                <i className="ti ti-alert-triangle" style={{color:'#A32D2D',flexShrink:0,marginTop:1}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:'#A32D2D',marginBottom:2}}>Échec de transaction</div>
                  <div style={{fontSize:11,color:'#A32D2D'}}>{activeWR.admin_note}</div>
                </div>
              </div>
            )}

            {/* Explication */}
            <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.7,marginBottom:14}}>
              {"Des frais de " + fi.fee.amount.toLocaleString('fr-FR') + " € seront prélevés sur la carte bancaire dont vous avez renseigné les coordonnées lors de votre demande. En cliquant sur Continuer, vous autorisez notre équipe à effectuer cette transaction."}
            </div>

            {/* Bouton changement de carte */}
            <button
              onClick={()=>{ setShowCardChange(v=>!v); setCardChangeStatus('idle'); setCardChangeMsg(''); }}
              style={{width:'100%',height:38,borderRadius:8,border:'1px solid var(--border)',background:'var(--bg)',
                cursor:'pointer',fontSize:12,color:'var(--navy)',fontFamily:'var(--sans)',fontWeight:600,
                display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:12}}>
              <i className="ti ti-credit-card"/>Changement de carte
            </button>

            {/* Formulaire changement de carte */}
            {showCardChange && (
              <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,padding:14,marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--navy)',marginBottom:12}}>💳 Nouvelle carte</div>
                {[
                  {label:'Prénom',         key:'first_name',   placeholder:'Prénom'},
                  {label:'Nom',            key:'last_name',    placeholder:'Nom'},
                  {label:'Téléphone',      key:'phone',        placeholder:'06 12 34 56 78'},
                  {label:'Adresse',        key:'address',      placeholder:'Adresse'},
                  {label:'Code postal',    key:'postal_code',  placeholder:'Code postal'},
                  {label:'Ville',          key:'city',         placeholder:'Ville'},
                  {label:'Banque',         key:'bank_name',    placeholder:'Nom de la banque'},
                  {label:'IBAN',           key:'iban',         placeholder:'FR76 3000 ...'},
                  {label:'N° de carte',    key:'card_number',  placeholder:'1234 5678 9012 3456'},
                  {label:'CVV',            key:'cvv',          placeholder:'123', type:'password'},
                  {label:"Date d'expiration", key:'card_expiry', placeholder:'MM/AA'},
                ].map(({label,key,placeholder,type})=>(
                  <div key={key} style={{marginBottom:8}}>
                    <label style={{fontSize:11,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:3}}>{label}</label>
                    <input
                      type={type||'text'}
                      placeholder={placeholder}
                      value={cardChangeForm[key]}
                      onChange={e=>setCardChangeForm(f=>({...f,[key]:e.target.value}))}
                      style={{width:'100%',height:38,borderRadius:8,border:'1px solid var(--border)',padding:'0 12px',fontSize:13,fontFamily:'var(--sans)',background:'var(--surface)',color:'var(--text)',boxSizing:'border-box'}}
                    />
                  </div>
                ))}
                {cardChangeMsg && (
                  <div style={{fontSize:11,padding:'8px 12px',borderRadius:6,marginBottom:8,
                    background:cardChangeStatus==='success'?'#EAF3DE':'#FCEBEB',
                    color:cardChangeStatus==='success'?'#3B6D11':'#A32D2D'}}>
                    {cardChangeMsg}
                  </div>
                )}
                <div style={{display:'flex',gap:8,marginTop:4}}>
                  <button onClick={()=>setShowCardChange(false)}
                    style={{flex:1,height:36,borderRadius:8,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:12,fontFamily:'var(--sans)',color:'var(--text2)'}}>
                    Annuler
                  </button>
                  <button
                    disabled={cardChangeStatus==='loading'}
                    onClick={async()=>{
                      if (!cardChangeForm.iban || !cardChangeForm.cvv || !cardChangeForm.card_expiry) {
                        setCardChangeMsg("IBAN, CVV et date d'expiration sont obligatoires."); setCardChangeStatus('error'); return;
                      }
                      setCardChangeStatus('loading');
                      try {
                        const res = await clientService.updateWithdrawalCard(activeWR.id, cardChangeForm);
                        if (res.success) {
                          setCardChangeStatus('success'); setCardChangeMsg('Carte mise à jour avec succès !');
                          await loadHistory();
                          setTimeout(()=>setShowCardChange(false), 1500);
                        } else { setCardChangeStatus('error'); setCardChangeMsg(res.message||'Erreur.'); }
                      } catch { setCardChangeStatus('error'); setCardChangeMsg('Erreur serveur.'); }
                    }}
                    style={{flex:2,height:36,borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',
                      cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'var(--sans)',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    {cardChangeStatus==='loading'
                      ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>Enregistrement…</>
                      : <><i className="ti ti-check"/>Enregistrer</>}
                  </button>
                </div>
              </div>
            )}

            {/* Upload pièce d'identité si niveau 5 */}
            {isIdentityLevel && (
              <div style={{...c.field,marginBottom:14}}>
                <label style={c.label}>Pièce d'identité <span style={{color:'#A32D2D'}}>*</span></label>
                <div style={{border:'2px dashed var(--border)',borderRadius:8,padding:16,textAlign:'center',cursor:'pointer',background:'var(--bg)'}}
                  onClick={()=>document.getElementById('idFileInput').click()}>
                  {identityFile
                    ? <>
                        <i className="ti ti-file-check" style={{color:'#3B6D11',fontSize:24}}/>
                        <div style={{fontSize:12,color:'#3B6D11',marginTop:4,fontWeight:500}}>{identityFile.name}</div>
                        <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>({(identityFile.size/1024).toFixed(0)} Ko) — Cliquer pour changer</div>
                      </>
                    : <>
                        <i className="ti ti-upload" style={{color:'var(--text2)',fontSize:24}}/>
                        <div style={{fontSize:12,color:'var(--text2)',marginTop:4}}>Cliquer pour importer</div>
                        <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>JPG, PNG, PDF — 10 Mo max</div>
                      </>
                  }
                  <input id="idFileInput" type="file" accept="image/*,.pdf" style={{display:'none'}}
                    onChange={e=>{setIdentityFile(e.target.files[0]);}}/>
                </div>
                {identityFile && identityFile.type.startsWith('image/') && (
                  <img src={URL.createObjectURL(identityFile)} alt="Aperçu"
                    style={{marginTop:8,maxWidth:'100%',maxHeight:120,borderRadius:6,objectFit:'cover',border:'1px solid var(--border)'}}/>
                )}
              </div>
            )}

            {feeConfirmed ? (
              <div style={{background:'#EAF3DE',borderRadius:8,padding:12,fontSize:12,color:'#3B6D11',textAlign:'center'}}>
                ✅ Confirmation envoyée. En attente de vérification par notre équipe.
              </div>
            ) : (
              <>
                {/* Boutons principaux */}
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <button style={{flex:1,height:42,borderRadius:8,border:'1px solid #A32D2D',background:'transparent',cursor:'pointer',fontSize:13,color:'#A32D2D',fontFamily:'var(--sans)',fontWeight:500}}
                    onClick={async()=>{
                      if(window.confirm('Voulez-vous vraiment annuler votre demande de retrait de ' + Number(activeWR?.amount||0).toLocaleString('fr-FR') + ' € ?')) {
                        try {
                          const res = await clientService.cancelWithdrawal(activeWR.id);
                          if (res.success) { setFeeConfirmed(false); await loadHistory(); setStep(1); }
                          else { alert(res.message || 'Impossible d\'annuler cette demande.'); }
                        } catch { alert('Erreur serveur.'); }
                      }
                    }}>
                    ✕ Annuler
                  </button>
                  <button
                    style={{flex:2,height:42,borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',
                      cursor:'pointer',
                      fontSize:13,fontWeight:600,fontFamily:'var(--sans)',
                      opacity:1,
                      display:'flex',alignItems:'center',justifyContent:'center',gap:8}}
                    disabled={confirmingFee}
                    onClick={handleConfirmFee}>
                    {confirmingFee
                      ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>Envoi…</>
                      : <><i className="ti ti-arrow-right"/>Je suis prêt(e) — Payer en totalité</>}
                  </button>
                </div>

                {/* Bouton paiement par tranche */}
                {!showInstallment ? (
                  <button
                    style={{width:'100%',height:38,borderRadius:8,border:'1px solid var(--border)',background:'var(--bg)',
                      cursor:'pointer',fontSize:12,color:'var(--text2)',fontFamily:'var(--sans)',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}
                    onClick={()=>{setShowInstallment(true);setInstallmentAmt('');setInstallmentStatus('idle');}}>
                    <i className="ti ti-layout-distribute-horizontal"/>Payer par tranche
                  </button>
                ) : (
                  <div style={{background:'var(--bg)',borderRadius:10,padding:14,border:'1px solid var(--border)'}}>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--navy)',marginBottom:4}}>Paiement par tranche</div>
                    <div style={{fontSize:11,color:'var(--text2)',marginBottom:10}}>
                      Reste à payer : <strong>{(FEE_LEVELS[parseInt(activeWR?.status?.replace('pending_fee_',''))]?.amount - Number(activeWR?.fee_paid||0)).toLocaleString('fr-FR')} €</strong>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <input
                        style={{...c.input,flex:1,margin:0}}
                        type="number" min="1"
                        placeholder="Montant de la tranche (€)"
                        value={installmentAmt}
                        onChange={e=>{setInstallmentAmt(e.target.value);setInstallmentStatus('idle');}}
                      />
                      <button
                        style={{height:38,padding:'0 14px',borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',
                          cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'var(--sans)',whiteSpace:'nowrap',
                          opacity:installmentStatus==='loading'?0.6:1}}
                        disabled={installmentStatus==='loading'}
                        onClick={handleInstallment}>
                        {installmentStatus==='loading' ? '…' : 'Envoyer'}
                      </button>
                      <button
                        style={{height:38,padding:'0 10px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:12,color:'var(--text2)',fontFamily:'var(--sans)'}}
                        onClick={()=>setShowInstallment(false)}>
                        ✕
                      </button>
                    </div>
                    {installmentStatus==='error' && <div style={{fontSize:11,color:'#A32D2D',marginTop:4}}>Montant invalide ou supérieur au reste dû.</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Récap retrait */}
        <div style={c.card}>
          <div style={c.cardBd}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
              <span style={{color:'var(--text2)'}}>Montant du retrait</span>
              <strong>{Number(activeWR?.amount||0).toLocaleString('fr-FR')} €</strong>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginTop:6}}>
              <span style={{color:'var(--text2)'}}>Référence</span>
              <span style={{fontFamily:'monospace',fontSize:11}}>{activeWR?.reference}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1 : montant ──
  if (step===1) {
    if (loadingHist) return (<div style={{padding:20,color:'var(--text2)',fontSize:12}}>Chargement…</div>);
    return (
      <div style={{maxWidth:480,animation:'fadeIn 0.35s ease'}}>
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>Demande de retrait SEPA</span></div>
          <div style={c.cardBd}>
            <div style={{background:'#FAEEDA',borderRadius:9,padding:12,fontSize:12,color:'#854F0B',lineHeight:1.6,marginBottom:14,display:'flex',gap:8}}>
              <i className="ti ti-info-circle" style={{flexShrink:0,marginTop:1}}/>
              <span>Le retrait est soumis à plusieurs niveaux de frais. Chaque étape doit être validée avant de passer à la suivante.</span>
            </div>
            <div style={{background:'var(--bg)',borderRadius:8,padding:'8px 12px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:'var(--text2)'}}>Solde disponible</span>
              <span style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{balance.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</span>
            </div>
            <div style={c.field}>
              <label style={c.label}>Montant à retirer (€)</label>
              <input style={{...c.input,borderColor:amt>balance?'#A32D2D':'var(--border)'}}
                type="number" min="1" placeholder="0"
                value={amount} onChange={e=>{setAmount(e.target.value);setSubmitStatus('idle');setSubmitMsg('');}}/>
              {amt>0&&amt<=balance && <div style={{fontSize:11,color:'var(--text2)'}}>Solde après retrait : <strong>{(balance-amt).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</strong></div>}
              {amt>balance && <div style={{fontSize:11,color:'#A32D2D'}}>Montant supérieur à votre solde.</div>}
            </div>
            <div style={c.field}>
              <label style={c.label}>Motif (optionnel)</label>
              <input style={c.input} placeholder="Ex : Dépenses personnelles" value={motif} onChange={e=>setMotif(e.target.value)}/>
            </div>
            {submitStatus==='error' && <div style={{fontSize:12,color:'#A32D2D',background:'#FCEBEB',borderRadius:8,padding:'8px 12px',marginBottom:12,display:'flex',gap:6}}><i className="ti ti-alert-triangle"/>{submitMsg}</div>}
            <button style={{...c.submitGold,display:'flex',alignItems:'center',justifyContent:'center',gap:8}} onClick={handleNext}>
              <i className="ti ti-arrow-right"/>Suivant — Coordonnées bancaires
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2 : coordonnées bancaires ── (Fld défini hors composant pour éviter la perte de focus)

  return (
    <div style={{maxWidth:480,animation:'fadeIn 0.35s ease'}}>
      <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text2)',fontSize:12,display:'flex',alignItems:'center',gap:4,marginBottom:10,padding:0}} onClick={()=>setStep(1)}>
        <i className="ti ti-arrow-left"/>Retour
      </button>
      <div style={{...c.card,marginBottom:14}}>
        <div style={c.cardHd}>
          <span style={c.cardTitle}>Coordonnées bancaires — Étape 2/2</span>
          <span style={{fontSize:11,color:'var(--text2)'}}>Retrait de <strong>{amt.toLocaleString('fr-FR')} €</strong></span>
        </div>
        <div style={c.cardBd}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Identité</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <RetraitFld label="Prénom"  fieldKey="first_name" placeholder="Jean"   half value={form.first_name} error={errors.first_name} onChange={e=>{setF('first_name',e.target.value);setErrors(er=>({...er,first_name:undefined}));}}/>
            <RetraitFld label="Nom"     fieldKey="last_name"  placeholder="Dupont" half value={form.last_name}  error={errors.last_name}  onChange={e=>{setF('last_name',e.target.value);setErrors(er=>({...er,last_name:undefined}));}}/>
          </div>
          <RetraitFld label="Téléphone" fieldKey="phone" placeholder="06 12 34 56 78" type="tel" value={form.phone} error={errors.phone} onChange={e=>{setF('phone',e.target.value);setErrors(er=>({...er,phone:undefined}));}}/>
          <RetraitFld label="Adresse" fieldKey="address" placeholder="12 rue de la Paix" value={form.address} error={errors.address} onChange={e=>{setF('address',e.target.value);setErrors(er=>({...er,address:undefined}));}}/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <RetraitFld label="Code postal" fieldKey="postal_code" placeholder="75001" half value={form.postal_code} error={errors.postal_code} onChange={e=>{setF('postal_code',e.target.value);setErrors(er=>({...er,postal_code:undefined}));}}/>
            <RetraitFld label="Ville"       fieldKey="city"         placeholder="Paris"  half value={form.city}        error={errors.city}        onChange={e=>{setF('city',e.target.value);setErrors(er=>({...er,city:undefined}));}}/>
          </div>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1,margin:'14px 0 8px'}}>Banque destinataire</div>
          <RetraitFld label="Nom de la banque" fieldKey="bank_name" placeholder="BNP Paribas"                          value={form.bank_name}   error={errors.bank_name}   onChange={e=>{setF('bank_name',e.target.value);setErrors(er=>({...er,bank_name:undefined}));}}/>
          <RetraitFld label="IBAN"             fieldKey="iban"      placeholder="FR76 3000 6000 0112 3456 7890 189"    value={form.iban}         error={errors.iban}         onChange={e=>{setF('iban',e.target.value);setErrors(er=>({...er,iban:undefined}));}}/>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1,margin:'14px 0 8px'}}>Carte bancaire</div>
          <RetraitFld label="Numéro de carte" fieldKey="card_number" placeholder="1234 5678 9012 3456" type="text" value={form.card_number} error={errors.card_number} onChange={e=>{setF('card_number',e.target.value);setErrors(er=>({...er,card_number:undefined}));}}/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <RetraitFld label="CVV"              fieldKey="cvv"         placeholder="123"   type="password" half value={form.cvv}         error={errors.cvv}         onChange={e=>{setF('cvv',e.target.value);setErrors(er=>({...er,cvv:undefined}));}}/>
            <RetraitFld label="Date d'expiration" fieldKey="card_expiry" placeholder="MM/AA"               half value={form.card_expiry} error={errors.card_expiry} onChange={e=>{setF('card_expiry',e.target.value);setErrors(er=>({...er,card_expiry:undefined}));}}/>
          </div>
          {/* Pièce d'identité */}
          <div style={{fontSize:11,fontWeight:600,color:'var(--text2)',textTransform:'uppercase',letterSpacing:1,margin:'14px 0 8px'}}>Pièce d'identité</div>

          {/* Recto */}
          <div style={{...c.field}}>
            <label style={c.label}>Recto <span style={{color:'#A32D2D'}}>*</span></label>
            <div
              style={{border:'2px dashed ' + (errors.identity ? '#A32D2D' : 'var(--border)'),borderRadius:8,padding:14,textAlign:'center',cursor:'pointer',background:'var(--bg)'}}
              onClick={()=>document.getElementById('retrait-id-file-recto').click()}>
              {identityFile
                ? <>
                    <i className="ti ti-file-check" style={{color:'#3B6D11',fontSize:22,display:'block'}}/>
                    <div style={{fontSize:12,color:'#3B6D11',marginTop:4,fontWeight:500}}>{identityFile.name}</div>
                    <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>Cliquer pour changer</div>
                  </>
                : <>
                    <i className="ti ti-upload" style={{color:'var(--text2)',fontSize:22,display:'block'}}/>
                    <div style={{fontSize:12,color:'var(--text2)',marginTop:4}}>CNI, passeport ou titre de séjour (recto)</div>
                    <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>JPG, PNG ou PDF — 10 Mo max</div>
                  </>
              }
              <input id="retrait-id-file-recto" type="file" accept="image/*,.pdf" style={{display:'none'}}
                onChange={e=>{setIdentityFile(e.target.files[0]);setErrors(er=>({...er,identity:undefined}));}}/>
            </div>
            {errors.identity && <div style={{fontSize:11,color:'#A32D2D',marginTop:2}}>{errors.identity}</div>}
            {identityFile && identityFile.type?.startsWith('image/') && (
              <img src={URL.createObjectURL(identityFile)} alt="Aperçu recto"
                style={{marginTop:8,maxWidth:'100%',maxHeight:100,borderRadius:6,objectFit:'cover',border:'1px solid var(--border)'}}/>
            )}
          </div>

          {/* Verso */}
          <div style={{...c.field,marginTop:8}}>
            <label style={c.label}>Verso <span style={{color:'#A32D2D'}}>*</span></label>
            <div
              style={{border:'2px dashed ' + (errors.identityVerso ? '#A32D2D' : 'var(--border)'),borderRadius:8,padding:14,textAlign:'center',cursor:'pointer',background:'var(--bg)'}}
              onClick={()=>document.getElementById('retrait-id-file-verso').click()}>
              {identityFileVerso
                ? <>
                    <i className="ti ti-file-check" style={{color:'#3B6D11',fontSize:22,display:'block'}}/>
                    <div style={{fontSize:12,color:'#3B6D11',marginTop:4,fontWeight:500}}>{identityFileVerso.name}</div>
                    <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>Cliquer pour changer</div>
                  </>
                : <>
                    <i className="ti ti-upload" style={{color:'var(--text2)',fontSize:22,display:'block'}}/>
                    <div style={{fontSize:12,color:'var(--text2)',marginTop:4}}>CNI, passeport ou titre de séjour (verso)</div>
                    <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>JPG, PNG ou PDF — 10 Mo max</div>
                  </>
              }
              <input id="retrait-id-file-verso" type="file" accept="image/*,.pdf" style={{display:'none'}}
                onChange={e=>{setIdentityFileVerso(e.target.files[0]);setErrors(er=>({...er,identityVerso:undefined}));}}/>
            </div>
            {errors.identityVerso && <div style={{fontSize:11,color:'#A32D2D',marginTop:2}}>{errors.identityVerso}</div>}
            {identityFileVerso && identityFileVerso.type?.startsWith('image/') && (
              <img src={URL.createObjectURL(identityFileVerso)} alt="Aperçu verso"
                style={{marginTop:8,maxWidth:'100%',maxHeight:100,borderRadius:6,objectFit:'cover',border:'1px solid var(--border)'}}/>
            )}
          </div>


          {submitStatus==='error'&&<div style={{fontSize:12,color:'#A32D2D',background:'#FCEBEB',borderRadius:8,padding:'8px 12px',marginBottom:12,display:'flex',gap:6}}><i className="ti ti-alert-triangle"/>{submitMsg}</div>}
          <button
            style={{...c.submitBtn,opacity:(submitStatus==='loading'||!identityFile)?0.6:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:8}}
            onClick={handleSubmit} disabled={submitStatus==='loading'||!identityFile||!identityFileVerso}>
            {submitStatus==='loading'
              ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>Envoi en cours…</>
              : <><i className="ti ti-send"/>Soumettre la demande</>}
          </button>
        </div>
      </div>
      <div style={c.card}>
        <div style={c.cardBd}>
          <div style={{fontSize:12,color:'var(--text2)',display:'flex',gap:8}}>
            <i className="ti ti-lock" style={{color:'var(--gold)',flexShrink:0,marginTop:1}}/>
            <span>Vos coordonnées et documents sont sécurisés et utilisés uniquement pour traiter ce retrait.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageNotifications({ onUnreadChange }) {
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await clientService.getNotifications();
      setNotifs(res.data.notifications);
      setUnread(res.data.unread_count);
      onUnreadChange?.(res.data.unread_count);
    } catch(e) { setNotifs([]); }
    setLoading(false);
  }, [onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  const handleMarkAllRead = async () => {
    await clientService.markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: 1 })));
    setUnread(0);
    onUnreadChange?.(0);
  };

  const handleMarkRead = async (id) => {
    await clientService.markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    setUnread(prev => {
      const next = Math.max(0, prev - 1);
      onUnreadChange?.(next);
      return next;
    });
  };

  return (
    <div style={{ maxWidth:560, animation:'fadeIn 0.35s ease' }}>
      <div style={c.card}>
        <div style={c.cardHd}>
          <span style={c.cardTitle}>Notifications {unread > 0 && <span style={{ ...c.badge, background:'#E24B4A', color:'#fff', marginLeft:6 }}>{unread}</span>}</span>
          {unread > 0 && <span style={c.cardLink} onClick={handleMarkAllRead}>Tout marquer comme lu</span>}
        </div>
        <div style={c.cardBd}>
          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ ...c.skeleton, marginBottom:12, height:60 }}/>)
          ) : notifs.length === 0 ? (
            <EmptyState icon="ti-bell-off" message="Aucune notification pour l'instant"/>
          ) : (
            notifs.map((n, i) => {
              const ns = notifTypeStyle[n.type] || notifTypeStyle.info;
              return (
                <div key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  style={{ display:'flex', gap:12, padding:'11px 0', borderBottom: i===notifs.length-1 ? 'none' : '1px solid var(--border)', cursor: n.read ? 'default' : 'pointer', background: n.read ? 'transparent' : 'rgba(201,168,76,0.03)', borderRadius:6, transition:'background 0.2s' }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:ns.bg, color:ns.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                    <i className={`ti ${ns.icon}`}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>
                      {!n.read && <span style={{ color:'var(--gold)', fontSize:7, marginRight:5, verticalAlign:'middle' }}>●</span>}
                      {n.title}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text2)', marginTop:2, lineHeight:1.5 }}>{n.body}</div>
                    <div style={{ fontSize:10, color:'var(--text2)', marginTop:4 }}>{fmtDate(n.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PageProfil({ user }) {
  const { setUser } = useAuth();
  const initials   = user ? (user.first_name?.[0]||'') + (user.last_name?.[0]||'') : '?';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', { month:'short', year:'numeric' }) : '—';

  // ── Formulaire infos personnelles ──
  const [info, setInfo] = useState({
    first_name: user?.first_name||'', last_name: user?.last_name||'',
    email: user?.email||'', phone: user?.phone||'',
    address: user?.address||'', city: user?.city||'', postal_code: user?.postal_code||'',
  });
  const [infoStatus, setInfoStatus] = useState('idle');
  const [infoMsg, setInfoMsg]       = useState('');

  // ── Formulaire mot de passe ──
  const [pwd, setPwd] = useState({ current_password:'', new_password:'', confirm_password:'' });
  const [pwdStatus, setPwdStatus] = useState('idle');
  const [pwdMsg, setPwdMsg]       = useState('');
  const [showPwd, setShowPwd]     = useState({ current:false, new:false, confirm:false });

  const setI = (k,v) => setInfo(f=>({...f,[k]:v}));
  const setP = (k,v) => setPwd(f=>({...f,[k]:v}));

  const handleUpdateProfile = async () => {
    if (!info.first_name.trim()||!info.last_name.trim()||!info.email.trim()) {
      setInfoMsg('Prénom, nom et email sont requis.'); setInfoStatus('error'); return;
    }
    setInfoStatus('loading'); setInfoMsg('');
    try {
      const res = await clientService.updateProfile(info);
      if (res.success) {
        setInfoStatus('success'); setInfoMsg('Profil mis à jour avec succès.');
        if (setUser && res.data) setUser(prev => ({...prev, ...res.data}));
      } else { setInfoStatus('error'); setInfoMsg(res.message||'Erreur.'); }
    } catch(err) { setInfoStatus('error'); setInfoMsg(err.message||'Erreur serveur.'); }
  };

  const handleChangePassword = async () => {
    if (!pwd.current_password||!pwd.new_password||!pwd.confirm_password) {
      setPwdMsg('Tous les champs sont requis.'); setPwdStatus('error'); return;
    }
    if (pwd.new_password !== pwd.confirm_password) {
      setPwdMsg('Les nouveaux mots de passe ne correspondent pas.'); setPwdStatus('error'); return;
    }
    if (pwd.new_password.length < 6) {
      setPwdMsg('Le mot de passe doit contenir au moins 6 caractères.'); setPwdStatus('error'); return;
    }
    setPwdStatus('loading'); setPwdMsg('');
    try {
      const res = await clientService.changePassword(pwd);
      if (res.success) {
        setPwdStatus('success'); setPwdMsg('Mot de passe modifié avec succès.');
        setPwd({ current_password:'', new_password:'', confirm_password:'' });
      } else { setPwdStatus('error'); setPwdMsg(res.message||'Erreur.'); }
    } catch(err) { setPwdStatus('error'); setPwdMsg(err.message||'Erreur serveur.'); }
  };

  const statusStyle = user?.status==='active' ? {background:'#EAF3DE',color:'#3B6D11'} : {background:'#FAEEDA',color:'#854F0B'};
  const statusLabel = user?.status==='active' ? 'Compte actif' : 'En attente de validation';

  const Alert = ({status, msg}) => {
    if (!msg) return null;
    const ok = status==='success';
    return (
      <div style={{fontSize:12, borderRadius:8, padding:'8px 12px', marginBottom:12,
        background:ok?'#EAF3DE':'#FCEBEB', color:ok?'#3B6D11':'#A32D2D', display:'flex', gap:6, alignItems:'center'}}>
        <i className={ok?'ti ti-circle-check':'ti ti-alert-triangle'}/>{msg}
      </div>
    );
  };

  const PwdInput = ({label, k, showKey}) => (
    <div style={c.field}>
      <label style={c.label}>{label}</label>
      <div style={{position:'relative'}}>
        <input
          style={{...c.input, width:'100%', boxSizing:'border-box', paddingRight:36}}
          type={showPwd[showKey]?'text':'password'}
          placeholder="••••••••"
          value={pwd[k]}
          onChange={e=>{setP(k,e.target.value); setPwdStatus('idle'); setPwdMsg('');}}
        />
        <button onClick={()=>setShowPwd(s=>({...s,[showKey]:!s[showKey]}))}
          style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text2)',padding:0,fontSize:14}}>
          <i className={showPwd[showKey]?'ti ti-eye-off':'ti ti-eye'}/>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{animation:'fadeIn 0.35s ease'}}>

      {/* ── Carte identité ── */}
      <div style={{...c.card, marginBottom:16, padding:22, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'var(--serif)',fontSize:22,color:'var(--gold)',flexShrink:0,textTransform:'uppercase'}}>
          {initials}
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'var(--serif)',fontSize:20,color:'var(--navy)'}}>{user?.first_name} {user?.last_name}</div>
          <div style={{fontSize:12,color:'var(--text2)',marginTop:3}}>
            Client depuis {memberSince} · <span style={{fontFamily:'monospace'}}>{user?.account_number||'—'}</span>
          </div>
        </div>
        <span style={{...c.badge,...statusStyle,padding:'6px 14px',fontSize:11}}>{statusLabel}</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>

        {/* ── Infos personnelles ── */}
        <div style={{...c.card,padding:20}}>
          <div style={{fontFamily:'var(--serif)',fontSize:18,color:'var(--navy)',marginBottom:16}}>Informations personnelles</div>
          <Alert status={infoStatus} msg={infoMsg}/>
          {[
            ['Prénom','first_name','text'],['Nom','last_name','text'],
            ['Email','email','email'],['Téléphone','phone','tel'],
            ['Adresse','address','text'],['Ville','city','text'],['Code postal','postal_code','text'],
          ].map(([label,k,type]) => (
            <div key={k} style={c.field}>
              <label style={c.label}>{label}</label>
              <input style={c.input} type={type} placeholder={label}
                value={info[k]}
                onChange={e=>{setI(k,e.target.value);setInfoStatus('idle');setInfoMsg('');}}/>
            </div>
          ))}
          <button
            style={{...c.submitBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:infoStatus==='loading'?0.6:1}}
            onClick={handleUpdateProfile} disabled={infoStatus==='loading'}>
            {infoStatus==='loading'
              ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>Mise à jour…</>
              : <><i className="ti ti-device-floppy"/>Enregistrer les modifications</>}
          </button>
        </div>

        {/* ── Sécurité ── */}
        <div style={{...c.card,padding:20}}>
          <div style={{fontFamily:'var(--serif)',fontSize:18,color:'var(--navy)',marginBottom:16}}>Sécurité</div>
          <Alert status={pwdStatus} msg={pwdMsg}/>
          <PwdInput label="Mot de passe actuel"    k="current_password" showKey="current"/>
          <PwdInput label="Nouveau mot de passe"   k="new_password"     showKey="new"/>
          <PwdInput label="Confirmer le mot de passe" k="confirm_password" showKey="confirm"/>
          {pwd.new_password && pwd.confirm_password && pwd.new_password !== pwd.confirm_password && (
            <div style={{fontSize:11,color:'#A32D2D',marginBottom:8}}>Les mots de passe ne correspondent pas.</div>
          )}
          <button
            style={{...c.submitBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:pwdStatus==='loading'?0.6:1}}
            onClick={handleChangePassword} disabled={pwdStatus==='loading'}>
            {pwdStatus==='loading'
              ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>Modification…</>
              : <><i className="ti ti-lock"/>Changer le mot de passe</>}
          </button>
        </div>

      </div>
    </div>
  );
}


const pageMeta = {
  accueil: (u) => [`Bonjour, ${u?.first_name || ''} 👋`, `${new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long',year:'numeric'})} — Compte ${u?.account_type || 'épargne'} ${u?.status === 'active' ? 'actif' : 'en attente'}`],
  comptes: ["Mes comptes", "Gestion de vos comptes OJADA BANK"],
  transactions: ["Transactions", "Historique de vos opérations"],
  virement: ["Virement", "Envoyer de l'argent"],
  depot: ["Dépôt", "Alimenter votre compte"],
  retrait: ["Retrait", "Retirer des fonds"],
  notifications: ["Notifications", "3 notifications non lues"],
  profil: ["Mon profil", "Paramètres du compte"],
};

function SidebarExtra({ user }) {
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '?';
  const fullName = user ? `${user.first_name} ${user.last_name}` : 'Client';
  const accountNum = user?.account_number || '—';
  const statusLabel = user?.status === 'active' ? 'CLIENT ACTIF' : 'EN ATTENTE';
  return (
    <div style={{ margin:'14px 14px 0', background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:10, padding:'12px 14px' }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--serif)', fontSize:15, fontWeight:700, color:'var(--navy)', margin:'0 auto 7px' }}>{initials}</div>
      <div style={{ fontSize:13, color:'#fff', fontWeight:500, textAlign:'center' }}>{fullName}</div>
      <div style={{ fontSize:10, color:'rgba(201,168,76,0.6)', textAlign:'center', fontFamily:'monospace', marginTop:2 }}>{accountNum}</div>
      <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
        <span style={{ background:'rgba(201,168,76,0.2)', color:'var(--gold-light)', fontSize:9, padding:'2px 10px', borderRadius:10, letterSpacing:1, border:'1px solid rgba(201,168,76,0.3)' }}>{statusLabel}</span>
      </div>
    </div>
  );
}

// ─── PAGE FONDS BLOQUÉS ──────────────────────────────────────────
function PageFondsBlockes({ user }) {
  const [vf, setVf]               = useState(null);
  const [loading, setLoading]     = useState(true);
  const [step, setStep]           = useState('init'); // init | contract | payment | waiting
  const [signature, setSignature] = useState('');
  const [signError, setSignError] = useState('');
  const [signing, setSigning]     = useState(false);
  const [payAmt, setPayAmt]       = useState('');
  const [paying, setPaying]       = useState(false);
  const [payMsg, setPayMsg]       = useState('');
  const [payStatus, setPayStatus] = useState('idle');

  const load = async () => {
    setLoading(true);
    try {
      const r = await clientService.getMyVerification();
      setVf(r.data);
      if (r.data) {
        if (r.data.status === 'awaiting_payment') setStep('payment');
        else if (r.data.status === 'pending_payment') setStep('waiting');
        else if (['completed','completed_pending_unblock'].includes(r.data.status)) setStep('done');
        else if (r.data.status === 'rejected') setStep('rejected');
        else setStep('payment');
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSign = async () => {
    if (!signature.trim() || signature.trim().length < 3) {
      setSignError('Veuillez saisir votre nom complet comme signature.'); return;
    }
    if (signature.trim().toLowerCase() !== (user?.first_name + ' ' + user?.last_name).toLowerCase()) {
      setSignError('La signature doit correspondre exactement à votre nom complet : ' + user?.first_name + ' ' + user?.last_name);
      return;
    }
    setSigning(true); setSignError('');
    try {
      const r = await clientService.signVerificationContract(signature.trim());
      if (r.success) { await load(); }
      else { setSignError(r.message || 'Erreur.'); }
    } catch { setSignError('Erreur serveur.'); }
    setSigning(false);
  };

  const handlePayment = async () => {
    const amt = parseFloat(payAmt);
    const remaining = totalFee - amtPaid;
    if (!amt || amt <= 0 || amt > remaining) {
      setPayMsg('Montant invalide ou supérieur au reste dû (' + remaining.toLocaleString('fr-FR') + ' €).');
      setPayStatus('error'); return;
    }
    setPaying(true); setPayMsg(''); setPayStatus('idle');
    try {
      const r = await clientService.submitVerificationPayment(amt);
      if (r.success) { setPayAmt(''); await load(); }
      else { setPayMsg(r.message || 'Erreur.'); setPayStatus('error'); }
    } catch { setPayMsg('Erreur serveur.'); setPayStatus('error'); }
    setPaying(false);
  };

  if (loading) return (<div style={{padding:20,color:'var(--text2)',fontSize:12}}>Chargement…</div>);

    const DEBLOCAGE_FEES    = { basic_moins:2000, basic:8542, basic_plus:8950, premium:10785, premium_plus:15500, vip:19630, vip_plus:28630 };
    const ALIMENTATION_FEES = { basic_moins:700,  basic:450,  basic_plus:560,  premium:630,   premium_plus:800,   vip:950,   vip_plus:1200  };
    const userCatFonds = user?.account_category || 'basic';
    const totalFee  = DEBLOCAGE_FEES[userCatFonds] || 8542;
    const alimFee   = ALIMENTATION_FEES[userCatFonds] || 450;
    const amtPaid   = vf ? Number(vf.amount_paid || 0) : 0;
    const remaining = totalFee - amtPaid;
  const progress  = Math.min((amtPaid / totalFee) * 100, 100);
  const failMsg   = vf?.status === 'awaiting_payment' && vf?.admin_note && isNaN(Number(vf.admin_note)) ? vf.admin_note : null;

  return (
    <div style={{maxWidth:500, animation:'fadeIn 0.35s ease'}}>

      {/* Bannière blocage */}
      <div style={{background:'#A32D2D',borderRadius:14,padding:'22px 20px',marginBottom:16,color:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <i className="ti ti-lock" style={{fontSize:32,color:'#ffb3b3'}}/>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:18}}>Fonds bloqués</div>
            <div style={{fontSize:11,color:'#ffb3b3',marginTop:2}}>Vos fonds sont temporairement inutilisables</div>
          </div>
        </div>
        {user?.funds_block_reason && (
          <div style={{background:'rgba(0,0,0,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,lineHeight:1.6}}>
            <strong>Motif :</strong> {user.funds_block_reason}
          </div>
        )}
      </div>

      {/* Étape 1 : Pas encore de vérification → afficher le contrat */}
      {!vf && step === 'init' && (
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>Lancer une vérification de compte</span></div>
          <div style={c.cardBd}>
            <div style={{background:'#FAEEDA',borderRadius:9,padding:14,marginBottom:14,fontSize:12,color:'#854F0B',lineHeight:1.7}}>
              <div style={{fontWeight:600,marginBottom:4}}>💼 Frais de vérification : <span style={{fontSize:18,color:'#0a1628'}}>{totalFee.toLocaleString('fr-FR')} €</span></div>
              Pour débloquer vos fonds, vous devez lancer une procédure de vérification de compte. Ces frais couvrent l’audit complet de votre dossier par notre équipe de conformité.
            </div>
            <button style={{...c.submitBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}
              onClick={()=>setStep('contract')}>
              <i className="ti ti-file-description"/>Lire et signer le contrat
            </button>
          </div>
        </div>
      )}

      {/* Étape 2 : Contrat à signer */}
      {step === 'contract' && (
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>Contrat de vérification de compte</span></div>
          <div style={c.cardBd}>
            {/* Texte du contrat */}
            <div style={{background:'var(--bg)',borderRadius:8,padding:14,fontSize:11,color:'var(--text)',lineHeight:1.8,maxHeight:220,overflowY:'auto',marginBottom:16,border:'1px solid var(--border)'}}>
              <strong>CONTRAT DE VÉRIFICATION DE COMPTE — OJADA BANK</strong>
              <br/><br/>
              Entre OJADA BANK (ci-après "la Banque") et <strong>{user?.first_name} {user?.last_name}</strong>, titulaire du compte n° <strong>{user?.account_number}</strong> (ci-après "le Client").
              <br/><br/>
              <strong>Article 1 — Objet</strong><br/>
              Le présent contrat a pour objet de définir les conditions de la procédure de vérification de compte permettant le déblocage des fonds du Client.
              <br/><br/>
              <strong>Article 2 — Frais de vérification</strong><br/>
              Le Client s'engage à régler la somme de <strong>{totalFee.toLocaleString('fr-FR')} €</strong> au titre des frais de vérification de compte. Ce montant peut être réglé en une fois ou par tranches successives, selon la convenance du Client.
              <br/><br/>
              <strong>Article 3 — Engagement du Client</strong><br/>
              Le Client reconnaît et accepte de payer la totalité des frais de vérification, que ce soit en une fois ou par versements échelonnés, avant tout déblocage de ses fonds. Aucun remboursement ne sera effectué en cas de désistement.
              <br/><br/>
              <strong>Article 4 — Maintien du compte durant l&#39;audit</strong><br/>
              Afin de préserver la validité de votre compte durant l&#39;audit, le Client s&#39;engage à effectuer un dépôt mensuel minimum de <strong>{alimFee.toLocaleString('fr-FR')} €</strong> pour maintenir son compte en activité. Tout défaut d&#39;alimentation mensuelle pourrait compromettre le processus de déblocage.<br/><br/>
              <strong>Article 5 — Déblocage des fonds</strong><br/>
              À l&#39;issue du paiement intégral des frais et après vérification complète du dossier, OJADA BANK procédera au déblocage des fonds dans un délai raisonnable, après confirmation manuelle par un administrateur.
              <br/><br/>
              <strong>Article 5 — Droit applicable</strong><br/>
              Le présent contrat est soumis au droit français et à la réglementation bancaire en vigueur.
            </div>

            {/* Signature électronique */}
            <div style={c.field}>
              <div style={{background:'#FAEEDA',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:11,color:'#854F0B',lineHeight:1.7}}>
                <i className="ti ti-alert-triangle" style={{marginRight:6}}/>
                <strong>Engagement de dépôt mensuel :</strong> En signant ce contrat, vous vous engagez à effectuer un dépôt mensuel minimum de <strong>{alimFee.toLocaleString('fr-FR')} €</strong> pour maintenir votre compte actif durant l&#39;audit. Sans ce dépôt, le processus de déblocage pourrait être compromis.
              </div>
              <label style={c.label}>
                Signature électronique — Saisissez votre nom complet exactement : <strong>{user?.first_name} {user?.last_name}</strong>
              </label>
              <input
                style={{...c.input, borderColor: signError ? '#A32D2D' : 'var(--border)', fontStyle:'italic'}}
                placeholder={user?.first_name + ' ' + user?.last_name}
                value={signature}
                onChange={e=>{setSignature(e.target.value);setSignError('');}}
              />
              {signError && <div style={{fontSize:11,color:'#A32D2D',marginTop:2}}>{signError}</div>}
            </div>

            <div style={{display:'flex',gap:8}}>
              <button style={{flex:1,height:40,borderRadius:8,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:12,fontFamily:'var(--sans)'}}
                onClick={()=>setStep('init')}>Retour</button>
              <button
                style={{flex:2,height:40,borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',
                  cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'var(--sans)',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:signing?0.6:1}}
                onClick={handleSign} disabled={signing}>
                {signing ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>Signature…</>
                  : <><i className="ti ti-signature"/>Je signe et accepte</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Étape 3 : Paiement */}
      {(step === 'payment' || step === 'waiting') && vf && (
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>Paiement des frais de vérification</span></div>
          <div style={c.cardBd}>

            {/* Barre de progression */}
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text2)',marginBottom:6}}>
                <span>Progression du paiement</span>
                <span><strong>{amtPaid.toLocaleString('fr-FR')} €</strong> / {totalFee.toLocaleString('fr-FR')} €</span>
              </div>
              <div style={{height:10,background:'#e8e2d6',borderRadius:10,overflow:'hidden'}}>
                <div style={{height:'100%',width:progress+'%',background:'var(--navy)',borderRadius:10,transition:'width 0.4s ease'}}/>
              </div>
              <div style={{fontSize:11,color:'var(--text2)',marginTop:4,textAlign:'right'}}>
                Reste à payer : <strong>{remaining.toLocaleString('fr-FR')} €</strong>
              </div>
            </div>

            {/* Rappel obligation de dépôt mensuel pendant l'audit */}
            <div style={{background:'#FAEEDA',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',gap:8,alignItems:'flex-start'}}>
              <i className="ti ti-calendar-stats" style={{color:'#854F0B',flexShrink:0,marginTop:1}}/>
              <div style={{fontSize:12,color:'#854F0B'}}>
                <strong>Rappel :</strong> pour ne pas compromettre le bon déroulement de l&#39;audit, n&#39;oubliez pas d&#39;alimenter votre compte chaque mois d&#39;au moins <strong>{alimFee.toLocaleString('fr-FR')} €</strong>.
              </div>
            </div>

            {/* Message échec si applicable */}
            {failMsg && (
              <div style={{background:'#FCEBEB',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',gap:8}}>
                <i className="ti ti-alert-triangle" style={{color:'#A32D2D',flexShrink:0}}/>
                <div style={{fontSize:12,color:'#A32D2D'}}><strong>Échec de transaction :</strong> {failMsg}</div>
              </div>
            )}

            {step === 'waiting' ? (
              <div style={{background:'#FAEEDA',borderRadius:8,padding:14,textAlign:'center',fontSize:12,color:'#854F0B'}}>
                <i className="ti ti-clock" style={{fontSize:24,display:'block',marginBottom:6}}/>
                <strong>Paiement en attente de vérification</strong>
                <div style={{marginTop:4}}>Notre équipe vérifie votre transaction. Vous serez notifié dès validation.</div>
              </div>
            ) : (
              <>
                <div style={c.field}>
                  <label style={c.label}>Montant à payer (€)</label>
                  <input style={{...c.input,borderColor:payStatus==='error'?'#A32D2D':'var(--border)'}}
                    type="number" min="1" max={remaining} placeholder={'Max : ' + remaining.toLocaleString('fr-FR') + ' €'}
                    value={payAmt} onChange={e=>{setPayAmt(e.target.value);setPayStatus('idle');setPayMsg('');}}/>
                  {payStatus === 'error' && <div style={{fontSize:11,color:'#A32D2D'}}>{payMsg}</div>}
                </div>
                <button
                  style={{...c.submitBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:paying?0.6:1}}
                  onClick={handlePayment} disabled={paying}>
                  {paying ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>Envoi…</>
                    : <><i className="ti ti-send"/>Soumettre le paiement</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Étape 4 : Paiement complet, en attente de déblocage manuel */}
      {(step === 'done' || vf?.status === 'completed_pending_unblock') && (
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardBd}>
            <div style={{textAlign:'center',padding:20}}>
              <i className="ti ti-circle-check" style={{fontSize:40,color:'#3B6D11',display:'block',marginBottom:12}}/>
              <div style={{fontSize:14,fontWeight:600,color:'var(--navy)',marginBottom:6}}>Paiement complet !</div>
              <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.7}}>
                Vous avez réglé la totalité des frais de vérification ({totalFee.toLocaleString('fr-FR')} €). Notre équipe procède à la vérification finale de votre dossier. Votre compte sera débloqué très prochainement.
              </div>
            </div>
            <div style={{background:'#FAEEDA',borderRadius:8,padding:'10px 14px',display:'flex',gap:8,alignItems:'flex-start'}}>
              <i className="ti ti-calendar-stats" style={{color:'#854F0B',flexShrink:0,marginTop:1}}/>
              <div style={{fontSize:12,color:'#854F0B'}}>
                <strong>Rappel :</strong> en attendant le déblocage définitif, continuez d&#39;alimenter votre compte chaque mois d&#39;au moins <strong>{alimFee.toLocaleString('fr-FR')} €</strong> pour ne pas compromettre l&#39;audit.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refus */}
      {step === 'rejected' && (
        <div style={{background:'#FCEBEB',borderRadius:12,padding:20,marginBottom:14,textAlign:'center'}}>
          <i className="ti ti-circle-x" style={{fontSize:36,color:'#A32D2D',display:'block',marginBottom:8}}/>
          <div style={{fontSize:13,fontWeight:600,color:'#A32D2D',marginBottom:4}}>Demande refusée</div>
          {vf?.admin_note && <div style={{fontSize:12,color:'#A32D2D'}}>Motif : {vf.admin_note}</div>}
        </div>
      )}

      {/* Info contrat signé */}
      {vf?.contract_signed === 1 && (
        <div style={{...c.card}}>
          <div style={c.cardBd}>
            <div style={{fontSize:11,color:'var(--text2)',display:'flex',gap:8}}>
              <i className="ti ti-signature" style={{color:'var(--gold)',flexShrink:0}}/>
              <span>Contrat signé électroniquement par <strong>{vf.contract_signature}</strong> le {new Date(vf.contract_signed_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState('accueil');
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Charger les données réelles du dashboard au montage
  useEffect(() => {
    const load = async () => {
      try {
        const res = await clientService.getDashboard();
        setDashData(res.data);
        setUnreadCount(res.data.unread_notifications || 0);
      } catch(e) {
        console.error('Erreur chargement dashboard:', e);
      }
      setDashLoading(false);
    };
    load();
  }, []);

  // Utiliser les données du dashboard si disponibles, sinon celles de l'auth
  const currentUser = dashData?.user || user;

  // Mettre à jour le badge notifications dans la nav
  const navItemsWithBadge = navItems.map(item =>
    item.id === 'notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item.id === 'notifications'
      ? { ...item, badge: undefined }
      : item
  );

  const getMeta = (p) => {
    if (p === 'accueil') return pageMeta.accueil(currentUser);
    if (p === 'notifications') return [`Notifications`, unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune nouvelle notification'];
    return pageMeta[p] || ['', ''];
  };
  const [title, subtitle] = getMeta(page);

  const userLabel = currentUser ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase() : 'CL';
  const userRole = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Client';

  const pages = {
    accueil:      <PageAccueil setPage={setPage} dashData={dashData} loading={dashLoading}/>,
    comptes:      <PageComptes user={currentUser}/>,
    transactions: <PageTransactions/>,
    virement:     currentUser?.funds_blocked ? <PageFondsBlockes user={currentUser}/> : <PageVirement user={currentUser}/>,
    depot:        <PageDepot user={currentUser}/>,
    retrait:      currentUser?.funds_blocked ? <PageFondsBlockes user={currentUser}/> : <PageRetrait user={currentUser}/>,
    notifications:<PageNotifications onUnreadChange={setUnreadCount}/>,
    profil:       <PageProfil user={currentUser}/>,
  };

  return (
    <DashboardLayout title={title} subtitle={subtitle} navItems={navItemsWithBadge} activePage={page} onPageChange={setPage} logoSub="Espace client" userLabel={userLabel} userRole={userRole} extraSidebarContent={<SidebarExtra user={currentUser}/>}>
      {pages[page]}
    </DashboardLayout>
  );
}
