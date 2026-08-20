import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import i18n from '../i18n';
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

// Équivalents Tailwind de `c` ci-dessus — utilisés uniquement dans les pages déjà
// migrées (Accueil pour l'instant). `c` reste utilisé tel quel par les pages pas
// encore converties ; les deux coexistent le temps de la migration progressive.
const tw = {
  card: 'rounded-xl border border-navy/10 bg-white',
  cardHd: 'flex items-center justify-between px-4 pt-[13px]',
  cardTitle: 'text-[13px] font-medium text-navy',
  cardLink: 'cursor-pointer text-[11px] text-[#185FA5]',
  cardBd: 'px-4 py-3',
  txnRow: 'flex items-center gap-2.5 py-2 border-b border-navy/10',
  txnIc: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px]',
  badge: 'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
  skeleton: 'rounded-md bg-gradient-to-r from-[#F8F6F1] via-navy/10 to-[#F8F6F1] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]',
  field: 'flex flex-col gap-[5px] mb-3.5',
  label: 'text-[11px] text-[#64748B]',
  input: 'h-[38px] rounded-lg border bg-[#F8F6F1] px-3 text-[13px] font-sans text-navy outline-none',
  select: 'h-[38px] rounded-lg border bg-[#F8F6F1] px-3 text-[13px] font-sans text-navy outline-none',
  submitBtn: 'h-10 w-full rounded-lg border-none bg-navy font-sans text-[13px] font-medium text-white cursor-pointer',
  submitGold: 'h-10 w-full rounded-lg border-none bg-gold font-sans text-[13px] font-medium text-navy cursor-pointer',
};

const getNavItems = (t) => [
  { section: t('client.mySpace') },
  { id:'accueil', icon:'ti-home', label: t('client.home') },
  { id:'comptes', icon:'ti-credit-card', label: t('client.myAccounts') },
  { id:'transactions', icon:'ti-arrows-exchange', label: t('nav.transactions') },
  { section: t('client.services') },
  { id:'virement', icon:'ti-send', label: t('nav.transfer') },
  { id:'depot', icon:'ti-arrow-down-circle', label: t('nav.deposit') },
  { id:'retrait', icon:'ti-arrow-up-circle', label: t('nav.withdrawal') },
  { section: t('client.account') },
  { id:'notifications', icon:'ti-bell', label: t('nav.notifications') },
  { id:'profil', icon:'ti-user-circle', label: t('client.myProfile') },
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
  admin:     { bg:'#EFF3FA', color:'#1B3A6B', icon:'ti-mail' },
  info:      { bg:'#F1EFE8', color:'#5F5E5A', icon:'ti-info-circle' },
};

// Un virement est sortant (débit) si sa description commence par "Virement vers"
const isOutgoingVirement = (t) => t.type === 'virement' && (t.description || '').trim().toLowerCase().startsWith('virement vers');

// Reconstruit la description d'une transaction dans la langue active, à partir de sa clé structurée
// (description_key + description_params). Si la transaction est antérieure à cette fonctionnalité
// (pas de clé enregistrée), on retombe sur le texte français d'origine stocké en base.
const translateTxnDescription = (t, txn) => {
  if (!txn.description_key) return txn.description;
  let params = {};
  try { params = txn.description_params ? JSON.parse(txn.description_params) : {}; } catch { /* ignore */ }
  let base;
  switch (txn.description_key) {
    case 'virement_vers': base = t('txnDesc.virementVers', { name: params.name }); break;
    case 'virement_de':   base = t('txnDesc.virementDe', { name: params.name }); break;
    case 'admin_deposit': base = t('txnDesc.adminDeposit'); break;
    case 'retrait_sepa':  base = t('txnDesc.retraitSepa', { bank: params.bank, last4: params.last4 }); break;
    default: return txn.description;
  }
  return params.motif ? `${base} — ${params.motif}` : base;
};

// Reconstruit le titre d'une notification système dans la langue active, à partir de sa clé structurée
// (title_key + title_params). Les notifications sans clé (texte libre tapé par un admin/client, ou
// notifications antérieures à cette fonctionnalité) retombent sur le texte français d'origine stocké en base.
const translateNotifTitle = (t, n) => {
  if (!n.title_key) return n.title;
  let p = {};
  try { p = n.title_params ? JSON.parse(n.title_params) : {}; } catch { /* ignore */ }
  switch (n.title_key) {
    case 'virementSentTitle':          return t('notif.virementSentTitle');
    case 'virementReceivedTitle':      return t('notif.virementReceivedTitle');
    case 'feePaymentPendingTitle':     return t('notif.feePaymentPendingTitle', { level: p.level });
    case 'installmentRequestTitle':    return t('notif.installmentRequestTitle', { level: p.level });
    case 'withdrawalRequestedTitle':   return t('notif.withdrawalRequestedTitle');
    case 'withdrawalCancelledTitle':   return t('notif.withdrawalCancelledTitle');
    case 'contractSignedTitle':        return t('notif.contractSignedTitle');
    case 'verifPaymentSubmittedTitle': return t('notif.verifPaymentSubmittedTitle');
    case 'withdrawalRejectedTitle':    return t('notif.withdrawalRejectedTitle');
    case 'feeTransactionFailedTitle':  return t('notif.feeTransactionFailedTitle', { level: p.level });
    case 'installmentValidatedTitle':  return t('notif.installmentValidatedTitle', { level: p.level });
    case 'feeLevelCompletedTitle':     return t('notif.feeLevelCompletedTitle', { level: p.level });
    case 'allFeesValidatedTitle':      return t('notif.allFeesValidatedTitle');
    case 'feeLevelValidatedTitle':     return t('notif.feeLevelValidatedTitle', { level: p.level });
    case 'stepAdvancedTitle':          return t('notif.stepAdvancedTitle', { level: p.level });
    case 'stepFinalTitle':             return t('notif.stepFinalTitle');
    case 'withdrawalApprovedTitle':    return t('notif.withdrawalApprovedTitle');
    case 'fundsBlockedTitle':          return t('notif.fundsBlockedTitle');
    case 'fundsUnblockedTitle':        return t('notif.fundsUnblockedTitle');
    case 'verifPaymentFailedTitle':    return t('notif.verifPaymentFailedTitle');
    case 'verifPaymentRejectedTitle':  return t('notif.verifPaymentRejectedTitle');
    case 'verifPaymentCompleteTitle':  return t('notif.verifPaymentCompleteTitle');
    case 'verifPaymentPartialTitle':   return t('notif.verifPaymentPartialTitle', { amount: p.amount });
    case 'welcomeTitle':               return t('notif.welcomeTitle');
    case 'replyTitle':                 return t('notif.replyTitle');
    case 'replyFromTeamTitle':         return t('notif.replyFromTeamTitle');
    case 'accountStatusUpdateTitle':   return t('notif.accountStatusUpdateTitle');
    case 'adminDepositTitle':          return t('notif.adminDepositTitle');
    default: return n.title;
  }
};

// Idem pour le corps. Le MOTIF qu'un admin tape librement (refus, blocage...) ne peut pas être traduit
// automatiquement : il est conservé tel quel et rattaché à la phrase traduite, comme pour les transactions.
const translateNotifBody = (t, n) => {
  if (!n.body_key) return n.body;
  let p = {};
  try { p = n.body_params ? JSON.parse(n.body_params) : {}; } catch { /* ignore */ }
  const withReason = (base, reason) => reason ? `${base} ${t('verification.reasonLabel')} ${reason}` : base;

  switch (n.body_key) {
    case 'virementSentBody':          return t('notif.virementSentBody', { amount: p.amount, name: p.name, account: p.account });
    case 'virementReceivedBody':      return t('notif.virementReceivedBody', { amount: p.amount, name: p.name });
    case 'feePaymentPendingBody':     return t('notif.feePaymentPendingBody', { amount: p.amount, feeName: p.feeName });
    case 'installmentRequestBody':    return t('notif.installmentRequestBody', { amount: p.amount, total: p.total });
    case 'withdrawalRequestedBody':   return t('notif.withdrawalRequestedBody', { amount: p.amount });
    case 'withdrawalCancelledBody':   return t('notif.withdrawalCancelledBody', { amount: p.amount });
    case 'contractSignedBody':        return t('notif.contractSignedBody');
    case 'verifPaymentSubmittedBody': return t('notif.verifPaymentSubmittedBody', { amount: p.amount });
    case 'withdrawalRejectedBody':    return withReason(t('notif.withdrawalRejectedBody'), p.reason);
    case 'feeTransactionFailedBody': {
      let base = t('notif.feeTransactionFailedBody', { level: p.level });
      if (p.remaining) base += ' ' + t('notif.remainingToPaySuffix', { remaining: p.remaining });
      return withReason(base, p.reason);
    }
    case 'installmentValidatedBody':  return t('notif.installmentValidatedBody', { amount: p.amount, remaining: p.remaining, feeName: p.feeName });
    case 'feeLevelCompletedBody':     return t('notif.feeLevelCompletedBody', { level: p.level, nextFeeName: p.nextFeeName, nextFeeAmount: p.nextFeeAmount });
    case 'allFeesValidatedBody':      return t('notif.allFeesValidatedBody');
    case 'feeLevelValidatedBody':     return t('notif.feeLevelValidatedBody', { nextFeeName: p.nextFeeName, nextFeeAmount: p.nextFeeAmount });
    case 'stepAdvancedBody':          return t('notif.stepAdvancedBody', { nextFeeName: p.nextFeeName, nextFeeAmount: p.nextFeeAmount });
    case 'stepFinalBody':             return t('notif.stepFinalBody');
    case 'withdrawalApprovedBody':    return t('notif.withdrawalApprovedBody', { amount: p.amount, newBalance: p.newBalance });
    case 'fundsBlockedBody':          return withReason(t('notif.fundsBlockedBody'), p.reason);
    case 'fundsUnblockedBody':        return t('notif.fundsUnblockedBody');
    case 'verifPaymentFailedBody':    return `${t('notif.verifPaymentFailedBody')} ${p.reason || t('notif.pleaseRetry')}`;
    case 'verifPaymentRejectedBody':  return withReason(t('notif.verifPaymentRejectedBody'), p.reason);
    case 'verifPaymentCompleteBody':  return t('notif.verifPaymentCompleteBody', { total: p.total });
    case 'verifPaymentPartialBody':   return t('notif.verifPaymentPartialBody', { remaining: p.remaining, total: p.total });
    case 'welcomeBody':               return t('notif.welcomeBody', { name: p.name, account: p.account });
    case 'accountStatusUpdateBody': {
      const statusLabelKey = { active:'statusActive', pending:'statusPending', inactive:'statusInactive', rejected:'statusRejected' };
      return t('notif.accountStatusUpdateBody', { status: t('notif.' + (statusLabelKey[p.statusCode] || 'statusPending')) });
    }
    case 'adminDepositBody':          return withReason(t('notif.adminDepositBody', { amount: p.amount, newBalance: p.newBalance }), p.reason);
    default: return n.body;
  }
};

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

// Locale à utiliser pour Intl/toLocaleDateString selon la langue active de l'app
// (indépendant des hooks React : utilisable aussi dans les fonctions hors composant comme fmtDate/getPageMeta)
const DATE_LOCALE_MAP = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', de: 'de-DE' };
const dLocale = () => DATE_LOCALE_MAP[i18n.language] || 'fr-FR';

// Formater une date
const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return i18n.t('common.justNow');
  if (diffMins < 60) return i18n.t('common.minutesAgo', { count: diffMins });

  // Comparaison sur le jour calendaire réel (et non sur le nombre d'heures écoulées),
  // pour qu'une transaction d'hier 23h ne s'affiche pas "Aujourd'hui" à 10h le lendemain.
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

  if (dayDiff === 0) return `${i18n.t('common.today')}, ${d.toLocaleTimeString(dLocale(), { hour:'2-digit', minute:'2-digit' })}`;
  if (dayDiff === 1) return `${i18n.t('common.yesterday')}, ${d.toLocaleTimeString(dLocale(), { hour:'2-digit', minute:'2-digit' })}`;
  return d.toLocaleDateString(dLocale(), { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
};

// Composant ligne transaction
function TxnRow({ t: txn, last }) {
  const { t } = useTranslation();
  const ts = getTxnStyle(txn);
  const typeLabel = t('dashboard.type' + txn.type.charAt(0).toUpperCase() + txn.type.slice(1));
  return (
    <div className={`${tw.txnRow} ${last ? 'border-b-0' : ''}`}>
      <div className={tw.txnIc} style={{ background: ts.bg, color: ts.color }}><i className={`ti ${ts.icon}`} /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-navy">{translateTxnDescription(t, txn) || typeLabel}</div>
        <div className="text-[10px] text-[#64748B]">{fmtDate(txn.created_at)}</div>
      </div>
      <div className="shrink-0 text-[13px] font-medium" style={{ color: ts.amountColor }}>{fmt(txn.amount, txn.type, txn.description)}</div>
    </div>
  );
}

// État vide
function EmptyState({ icon, message }) {
  return (
    <div className="px-4 py-7 text-center text-[#64748B]">
      <i className={`ti ${icon} mb-2 block text-3xl opacity-30`} />
      <div className="text-xs">{message}</div>
    </div>
  );
}
function PageAccueil({ setPage, dashData, loading }) {
  const { t } = useTranslation();
  const user = dashData?.user;
  const recentTxns = dashData?.recent_transactions || [];
  const monthStats = dashData?.month_stats || {};
  const balance = user?.balance ?? 0;
  const accountNum = user?.account_number || '—';

  return (
    <div className="animate-[fadeIn_0.35s_ease]">
      {/* Balance Hero */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-3 px-5 py-6">
        <div className="pointer-events-none absolute -right-[30px] -top-[30px] h-40 w-40 rounded-full bg-[radial-gradient(rgba(201,168,76,0.15),transparent_70%)]" />
        <div className="relative mb-4 text-right">
          <div className="text-[10px] uppercase tracking-wide text-gold/50">{(user?.account_type === 'epargne' || !user?.account_type ? t('dashboard.savings') : user.account_type)} · {accountNum.slice(-4)}</div>
        </div>
        <div className="relative mb-1 text-[11px] text-white/45">{t('dashboard.availableBalance')}</div>
        <div className="relative mb-1 font-serif text-[clamp(30px,5vw,42px)] font-semibold text-white">
          {loading ? <span className="opacity-40">—</span> : balance.toLocaleString('fr-FR')}
          <span className="text-[clamp(16px,2.5vw,20px)] text-white/40"> €</span>
        </div>
        <div className="relative mb-[22px] text-xs text-white/35">
          {t('dashboard.thisMonth')} : <span className="text-[#7BC67A]">+{(monthStats.total_depot || 0).toLocaleString('fr-FR')} € {t('dashboard.received')}</span>
        </div>
        <div className="relative flex flex-wrap gap-2.5">
          {[['ti-send',t('nav.transfer'),'virement'],['ti-arrow-down-circle',t('nav.deposit'),'depot'],['ti-arrow-up-circle',t('nav.withdrawal'),'retrait']].map(([ic,lb,pg]) => (
            <button
              key={pg}
              onClick={() => setPage(pg)}
              className={[
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all',
                pg === 'virement' ? 'bg-gold text-navy' : 'border border-white/15 bg-white/[0.08] text-white/75',
              ].join(' ')}
            >
              <i className={`ti ${ic}`}/>{lb}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4 grid grid-cols-4 gap-2.5">
        {[['ti-send',t('nav.transfer'),'#E6F1FB','#185FA5','virement'],['ti-arrow-down-circle',t('nav.deposit'),'#EAF3DE','#3B6D11','depot'],['ti-arrow-up-circle',t('nav.withdrawal'),'#FCEBEB','#A32D2D','retrait'],['ti-receipt',t('nav.statement'),'#FDF6E3','#854F0B','transactions']].map(([ic,lb,bg,col,pg]) => (
          <div
            key={pg}
            onClick={() => setPage(pg)}
            className="cursor-pointer rounded-xl border border-navy/10 bg-white px-2.5 py-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(10,22,40,0.08)]"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-[11px] text-lg" style={{ background: bg, color: col }}><i className={`ti ${ic}`}/></div>
            <div className="text-[11px] font-medium text-navy">{lb}</div>
          </div>
        ))}
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
        <div className={tw.card}>
          <div className={tw.cardHd}><span className={tw.cardTitle}>{t('dashboard.recentTransactions')}</span><span className={tw.cardLink} onClick={() => setPage('transactions')}>{t('common.seeAll')} →</span></div>
          <div className={tw.cardBd}>
            {loading ? (
              [1,2,3].map(i => <div key={i} className={`${tw.skeleton} mb-3 h-10`}/>)
            ) : recentTxns.length === 0 ? (
              <EmptyState icon="ti-arrows-exchange" message={t('dashboard.noTransactionsYet')}/>
            ) : (
              recentTxns.map((t,i) => <TxnRow key={t.id} t={t} last={i===recentTxns.length-1}/>)
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className={tw.card}>
            <div className={tw.cardHd}><span className={tw.cardTitle}>{t('dashboard.accountInfo')}</span></div>
            <div className={tw.cardBd}>
              {[
                [t('dashboard.type'), (user?.account_type === 'epargne' || !user?.account_type ? t('dashboard.savings') : user.account_type)],
                [t('dashboard.number'), user?.account_number || '—'],
                [t('dashboard.opening'), user?.created_at ? new Date(user.created_at).toLocaleDateString(dLocale(),{day:'2-digit',month:'short',year:'numeric'}) : '—'],
                [t('dashboard.status'), user?.status === 'active' ? t('dashboard.active') : t('dashboard.pendingStatus')]
              ].map(([k,v]) => (
                <div key={k} className="flex items-center justify-between border-b border-navy/10 py-1.5 text-xs">
                  <span className="text-[#64748B]">{k}</span>
                  {k===t('dashboard.status')
                    ? <span className={tw.badge} style={{ background: user?.status==='active' ? '#EAF3DE' : '#FAEEDA', color: user?.status==='active' ? '#3B6D11' : '#854F0B' }}>{v}</span>
                    : <span className={k===t('dashboard.number') ? 'font-mono text-[11px]' : ''}>{v}</span>}
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
  const { t } = useTranslation();
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

  if (loading) return <div className="text-xs text-[#64748B]">{t('dashboard.loadingChart')}</div>;
  if (data.length === 0) return <div className="text-xs text-[#64748B]">{t('dashboard.noActivity')}</div>;

  // Trouver le max pour échelonner les barres
  const maxTotal = Math.max(...data.map(d => d.total || 0), 1);

  return (
    <div className="flex items-end gap-2 h-[90px] py-2">
      {data.map((item, idx) => {
        const [year, month] = item.month.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(dLocale(), { month:'short' });
        const height = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
        const isLast = idx === data.length - 1;
        return (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-[3px] cursor-pointer transition-opacity duration-200 opacity-80 hover:opacity-100 ${isLast ? 'bg-gold' : 'bg-[#F0D080]'}`}
              style={{ height:`${Math.max(height, 5)}%` }}
              title={`${monthName} : ${item.total.toLocaleString('fr-FR')} €`}
            />
            <span className="text-[10px] text-[#64748B]">{monthName}</span>
          </div>
        );
      })}
    </div>
  );
}


function PageComptes({ user }) {
  const { t } = useTranslation();
  const isActive = user?.status === 'active';
  return (
    <div className="animate-[fadeIn_0.35s_ease]">
      <div className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-3 p-[22px]">
          <div className="absolute -right-5 -top-5 h-[100px] w-[100px] rounded-full bg-[radial-gradient(rgba(201,168,76,0.15),transparent_70%)]"/>
          <div className="mb-[3px] text-[10px] uppercase tracking-wide text-gold/50">{t('dashboard.savingsAccount')}</div>
          <div className="mb-3.5 font-mono text-xs tracking-[2px] text-white/35">OJ •••• •••• 4421</div>
          <div className="mb-[3px] font-serif text-[clamp(24px,4vw,30px)] text-white">{(user?.balance ?? 0).toLocaleString('fr-FR')} <span className="text-sm text-white/35">€</span></div>
          <div className="mb-4 text-[11px] text-white/30">{t('dashboard.availableBalance')}</div>
          <div className="flex items-end justify-between">
            <span className="text-xs uppercase tracking-wide text-white/50">
              {user?.first_name?.[0] || ''}. {user?.last_name?.toUpperCase() || ''}
            </span>
            <span className={`${tw.badge} ${isActive ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAEEDA] text-[#854F0B]'}`}>
              {isActive ? t('dashboard.active') : t('dashboard.pendingStatus')}
            </span>
          </div>
        </div>
        <div className={tw.card}>
          <div className={tw.cardBd}>
            <div className="mb-3.5 text-xs font-medium text-navy">{t('dashboard.accountDetails')}</div>
            {[[t('dashboard.type'), (user?.account_type === 'epargne' || !user?.account_type ? t('dashboard.savings') : user.account_type)],[t('dashboard.number'), user?.account_number || '—'],[t('dashboard.opening'), user?.created_at ? new Date(user.created_at).toLocaleDateString(dLocale()) : '—'],[t('dashboard.interestRate'),`3,5% ${t('dashboard.perYear')}`],[t('dashboard.nextInterest'), (() => {
                const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
                return d.toLocaleDateString(dLocale(), { day:'2-digit', month:'long', year:'numeric' });
              })()],[t('dashboard.status'), user?.status === 'active' ? t('dashboard.active') : t('dashboard.pendingStatus')]].map(([k,v]) => (
              <div key={k} className="flex justify-between border-b border-navy/10 py-[7px] text-xs">
                <span className="text-[#64748B]">{k}</span>
                {k===t('dashboard.interestRate') ? <span className="font-medium text-[#3B6D11]">{v}</span> : k===t('dashboard.status') ? <span className={`${tw.badge} bg-[#EAF3DE] text-[#3B6D11]`}>{v}</span> : <span className={k===t('dashboard.number') ? 'font-mono text-[11px]' : ''}>{v}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={tw.card}>
        <div className={tw.cardHd}><span className={tw.cardTitle}>{t('dashboard.activityLastMonths')}</span></div>
        <div className={tw.cardBd}>
          <MonthlyActivityChart/>
        </div>
      </div>

      {/* ── Informations bancaires IBAN / BIC ── */}
      <div className={`${tw.card} mt-3.5`}>
        <div className={tw.cardHd}><span className={tw.cardTitle}>{t('dashboard.bankInfo')}</span></div>
        <div className={tw.cardBd}>
          {user?.client_iban ? (
            <>
              <div className="flex justify-between border-b border-navy/10 py-2">
                <span className="text-xs text-[#64748B]">IBAN</span>
                <span className="font-mono text-xs font-semibold tracking-wide text-navy">
                  {user.client_iban.replace(/(.{4})/g, '$1 ').trim()}
                </span>
              </div>
              <div className="flex justify-between border-b border-navy/10 py-2">
                <span className="text-xs text-[#64748B]">BIC / SWIFT</span>
                <span className="font-mono text-xs font-semibold text-navy">{user.client_bic}</span>
              </div>
              <div className="flex justify-between border-b border-navy/10 py-2">
                <span className="text-xs text-[#64748B]">{t('dashboard.holder')}</span>
                <span className="text-xs font-medium">{user.first_name} {user.last_name}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-xs text-[#64748B]">{t('dashboard.bank')}</span>
                <span className="text-xs font-medium">OJADA BANK</span>
              </div>
              <div className="mt-2.5 flex gap-1.5 rounded-lg bg-[#EAF3DE] px-3 py-2 text-[11px] text-[#3B6D11]">
                <i className="ti ti-info-circle mt-px shrink-0"/>
                <span>{t('dashboard.bankInfoNote')}</span>
              </div>
            </>
          ) : (
            <div className="py-5 text-center">
              <i className="ti ti-building-bank mb-2 block text-[32px] text-[#64748B] opacity-30"/>
              <div className="text-xs text-[#64748B]">{t('dashboard.bankInfoPending')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageTransactions() {
  const { t } = useTranslation();
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

  const filterLabels = { tous: t('dashboard.filterAll'), depot: t('dashboard.filterDeposits'), retrait: t('dashboard.filterWithdrawals'), virement: t('dashboard.filterTransfers') };

  return (
    <div className="animate-[fadeIn_0.35s_ease]">
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {['tous','depot','retrait','virement'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border border-navy/10 px-3.5 py-[5px] font-sans text-[11px] transition-colors duration-150 ${filter===f ? 'bg-navy text-white' : 'bg-transparent text-[#64748B]'}`}>
            {filterLabels[f]}
          </button>
        ))}
      </div>
      <div className={tw.card}>
        {loading ? (
          <div className="p-4">{[1,2,3,4].map(i => <div key={i} className={`${tw.skeleton} mb-3 h-9`}/>)}</div>
        ) : txns.length === 0 ? (
          <EmptyState icon="ti-receipt" message={t('dashboard.noTransactionsYet')}/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>{[t('dashboard.colReference'),t('dashboard.colDescription'),t('dashboard.colType'),t('dashboard.colAmount'),t('dashboard.colDate'),t('dashboard.colStatus')].map(h => (
                  <th key={h} className="whitespace-nowrap border-b border-navy/10 px-3 py-[7px] text-left text-[10px] font-medium uppercase tracking-wide text-[#64748B]">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {txns.map((tx,i) => {
                  const ts = getTxnStyle(tx);
                  const typeLabel = t('dashboard.type' + tx.type.charAt(0).toUpperCase() + tx.type.slice(1));
                  return (
                    <tr key={tx.id} className={i%2===0 ? 'bg-transparent' : 'bg-black/[0.01]'}>
                      <td className="whitespace-nowrap px-3 py-[9px] font-mono text-[11px] text-[#64748B]">{tx.reference}</td>
                      <td className="px-3 py-[9px]">{translateTxnDescription(t, tx) || typeLabel}</td>
                      <td className="px-3 py-[9px]"><span className={tw.badge} style={{ background:ts.bg, color:ts.color }}>{typeLabel}</span></td>
                      <td className="whitespace-nowrap px-3 py-[9px] font-medium" style={{ color:ts.amountColor }}>{fmt(tx.amount, tx.type, tx.description)}</td>
                      <td className="whitespace-nowrap px-3 py-[9px] text-[11px] text-[#64748B]">{fmtDate(tx.created_at)}</td>
                      <td className="px-3 py-[9px]"><span className={`${tw.badge} ${tx.status==='valide' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAEEDA] text-[#854F0B]'}`}>{tx.status==='valide'?t('dashboard.validated'):t('dashboard.pendingStatus')}</span></td>
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
  const { t } = useTranslation();
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
    if (!amt || amt <= 0) { setSubmitMsg(t('virement.invalidAmount')); setSubmitStatus('error'); return; }
    if (user && amt > user.balance) { setSubmitMsg(t('virement.insufficientBalance')); setSubmitStatus('error'); return; }
    setSubmitStatus('loading'); setSubmitMsg('');
    try {
      const res = await clientService.transfer({ account_number: accountNumber.trim(), amount: amt, motif: motif.trim() || undefined });
      if (res.success) {
        setSubmitStatus('success');
        setSubmitMsg(t('virement.transferSentSuccess', { amount: amt.toLocaleString('fr-FR'), name: receiverInfo.name }));
        setNewBalance(res.data?.new_balance ?? null);
        setAccountNumber(''); setAmount(''); setMotif(''); setReceiverInfo(null); setLookupStatus('idle');
      } else { setSubmitStatus('error'); setSubmitMsg(res.message || t('virement.transferError')); }
    } catch (err) { setSubmitStatus('error'); setSubmitMsg(err.message || t('common.error_generic')); }
  };

  const balance = user?.balance ?? 0;
  const amt     = parseFloat(amount) || 0;
  const canSend = lookupStatus === 'found' && amt > 0 && amt <= balance && submitStatus !== 'loading';

  const acctBorder = lookupStatus==='found' ? 'border-[#3B6D11]' : lookupStatus==='notfound' ? 'border-[#A32D2D]' : 'border-navy/10';
  const amtBorder = amt > balance ? 'border-[#A32D2D]' : 'border-navy/10';

  return (
    <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">

      {submitStatus === 'success' && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-[10px] border border-[#B6D99B] bg-[#EAF3DE] px-4 py-3">
          <i className="ti ti-circle-check mt-px shrink-0 text-lg text-[#3B6D11]"/>
          <div>
            <div className="mb-0.5 text-xs font-semibold text-[#3B6D11]">{t('virement.transferCompleted')}</div>
            <div className="text-xs text-[#3B6D11]">{submitMsg}</div>
            {newBalance !== null && (
              <div className="mt-1 text-[11px] text-[#5a8c2f]">
                {t('virement.newBalanceLabel')} : <strong>{newBalance.toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`${tw.card} mb-3.5`}>
        <div className={tw.cardHd}><span className={tw.cardTitle}>{t('virement.newTransferTitle')}</span></div>
        <div className={tw.cardBd}>

          <div className="mb-3.5 flex items-center justify-between rounded-lg bg-[#F8F6F1] px-3 py-2">
            <span className="text-[11px] text-[#64748B]">{t('dashboard.availableBalance')}</span>
            <span className="text-[13px] font-semibold text-navy">{balance.toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</span>
          </div>

          <div className={tw.field}>
            <label className={tw.label}>{t('virement.receiverAccountNumber')}</label>
            <div className="relative">
              <input
                className={`${tw.input} w-full box-border pr-9 ${acctBorder}`}
                placeholder="Ex : OJ-2025-0042"
                value={accountNumber}
                onChange={e => { setAccountNumber(e.target.value); setSubmitStatus('idle'); }}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[15px]">
                {lookupStatus==='loading'  && <i className="ti ti-loader-2 animate-spin text-[#64748B]"/>}
                {lookupStatus==='found'    && <i className="ti ti-circle-check text-[#3B6D11]"/>}
                {lookupStatus==='notfound' && <i className="ti ti-circle-x text-[#A32D2D]"/>}
              </div>
            </div>
            {lookupStatus==='found' && receiverInfo && (
              <div className="mt-0.5 flex items-center gap-[5px] text-[11px] text-[#3B6D11]">
                <i className="ti ti-user-check"/>
                <span><strong>{receiverInfo.name}</strong> — {receiverInfo.account_number}</span>
              </div>
            )}
            {lookupStatus==='notfound' && (
              <div className="mt-0.5 flex items-center gap-[5px] text-[11px] text-[#A32D2D]">
                <i className="ti ti-alert-circle"/>
                <span>{t('virement.noActiveAccountFound')}</span>
              </div>
            )}
          </div>

          <div className={tw.field}>
            <label className={tw.label}>{t('virement.amountLabel')}</label>
            <input
              className={`${tw.input} w-full box-border ${amtBorder}`}
              type="number" min="1" placeholder="0"
              value={amount}
              onChange={e => { setAmount(e.target.value); setSubmitStatus('idle'); }}
            />
            {amt > 0 && amt <= balance && (
              <div className="text-[11px] text-[#64748B]">
                {t('virement.balanceAfterTransfer')} : <strong>{(balance - amt).toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</strong>
              </div>
            )}
            {amt > balance && <div className="text-[11px] text-[#A32D2D]">{t('virement.amountExceedsBalance')}</div>}
          </div>

          <div className={tw.field}>
            <label className={tw.label}>{t('virement.motifOptional')}</label>
            <input className={`${tw.input} w-full box-border border-navy/10`} placeholder={t('virement.motifPlaceholder')} value={motif} onChange={e => setMotif(e.target.value)}/>
          </div>

          {submitStatus==='error' && (
            <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-[#FCEBEB] px-3 py-2 text-xs text-[#A32D2D]">
              <i className="ti ti-alert-triangle"/>{submitMsg}
            </div>
          )}

          <button
            className={`${tw.submitGold} flex items-center justify-center gap-2 ${canSend ? 'opacity-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            onClick={handleSubmit}
            disabled={!canSend}
          >
            {submitStatus==='loading'
              ? <><i className="ti ti-loader-2 animate-spin"/>{t('virement.sendingInProgress')}</>
              : <><i className="ti ti-send"/>{t('virement.confirmTransfer')}</>}
          </button>

        </div>
      </div>

      <div className={tw.card}>
        <div className={tw.cardBd}>
          <div className="flex gap-2 text-xs text-[#64748B]">
            <i className="ti ti-info-circle mt-px shrink-0 text-gold"/>
            <span>{t('virement.transferInfoNote')}</span>
          </div>
        </div>
      </div>

    </div>
  );
}

function PageDepot({ user }) {
  const { t } = useTranslation();
  const balance = Number(user?.balance ?? 0);
  const accountNum = user?.account_number || '—';

  return (
    <div className="max-w-[520px] animate-[fadeIn_0.35s_ease]">

      {/* Bannière principale */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-navy px-6 py-7 text-center">
        <div className="absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-gold/[0.08]"/>
        <div className="absolute -bottom-[30px] -left-5 h-[90px] w-[90px] rounded-full bg-gold/[0.06]"/>
        <i className="ti ti-building-bank mb-3 block text-[38px] text-gold"/>
        <div className="mb-2 font-serif text-xl text-white">{t('depot.physicalOnlyTitle')}</div>
        <div className="mx-auto max-w-[360px] text-[13px] leading-[1.7] text-white/75">
          {t('depot.physicalOnlyDesc', { bank: 'OJADA BANK' }).split('OJADA BANK').map((part, i, arr) => (
            <React.Fragment key={i}>{part}{i < arr.length - 1 && <strong className="text-gold">OJADA BANK</strong>}</React.Fragment>
          ))}
        </div>
      </div>

      {/* Pourquoi ce choix */}
      <div className={`${tw.card} mb-3.5`}>
        <div className={tw.cardHd}><span className={tw.cardTitle}>{t('depot.whyThisChoice')}</span></div>
        <div className={tw.cardBd}>
          {[
            ['ti-shield-lock',  t('depot.reason1Title'), t('depot.reason1Desc')],
            ['ti-eye-check',    t('depot.reason2Title'), t('depot.reason2Desc')],
            ['ti-user-check',   t('depot.reason3Title'), t('depot.reason3Desc')],
            ['ti-certificate',  t('depot.reason4Title'), t('depot.reason4Desc')],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3 border-b border-navy/10 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#FAEEDA]">
                <i className={"ti " + icon + " text-base text-gold"}/>
              </div>
              <div>
                <div className="mb-0.5 text-xs font-semibold text-navy">{title}</div>
                <div className="text-[11px] leading-[1.6] text-[#64748B]">{desc}</div>
              </div>
            </div>
          ))}
          <div className="flex gap-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#EAF3DE]">
              <i className="ti ti-clock text-base text-[#3B6D11]"/>
            </div>
            <div>
              <div className="mb-0.5 text-xs font-semibold text-navy">{t('depot.immediateCreditTitle')}</div>
              <div className="text-[11px] leading-[1.6] text-[#64748B]">{t('depot.immediateCreditDesc')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Infos compte */}
      <div className={`${tw.card} mb-3.5`}>
        <div className={tw.cardHd}><span className={tw.cardTitle}>{t('depot.yourAccountInfo')}</span></div>
        <div className={tw.cardBd}>
          <div className="flex items-center justify-between border-b border-navy/10 py-2">
            <span className="text-xs text-[#64748B]">{t('depot.accountNumberLabel')}</span>
            <span className="font-mono text-xs font-semibold">{accountNum}</span>
          </div>
          <div className="flex items-center justify-between border-b border-navy/10 py-2">
            <span className="text-xs text-[#64748B]">{t('depot.holderLabel')}</span>
            <span className="text-xs font-semibold">{user?.first_name} {user?.last_name}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-[#64748B]">{t('depot.currentBalance')}</span>
            <span className="text-sm font-bold text-navy">{balance.toLocaleString('fr-FR', { style:'currency', currency:'EUR' })}</span>
          </div>
        </div>
      </div>

      {/* Comment faire un dépôt */}
      <div className={tw.card}>
        <div className={tw.cardHd}><span className={tw.cardTitle}>{t('depot.howToDeposit')}</span></div>
        <div className={tw.cardBd}>
          {[
            ['1', t('depot.step1Title'), t('depot.step1Desc')],
            ['2', t('depot.step2Title'), t('depot.step2Desc', { account: accountNum })],
            ['3', t('depot.step3Title'), t('depot.step3Desc')],
            ['4', t('depot.step4Title'), t('depot.step4Desc')],
          ].map(([num, title, desc]) => (
            <div key={num} className={`flex gap-3 py-2.5 ${num!=='4' ? 'border-b border-navy/10' : ''}`}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-gold">{num}</div>
              <div>
                <div className="mb-0.5 text-xs font-semibold text-navy">{title}</div>
                <div className="text-[11px] leading-[1.6] text-[#64748B]">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Composant champ de formulaire — défini HORS de PageRetrait pour éviter la perte de focus au re-render
function RetraitFld({ label, fieldKey, placeholder, type, half, value, error, onChange, required=true }) {
  return (
    <div className={`${tw.field} ${half ? 'w-[calc(50%-4px)]' : ''}`}>
      <label className={tw.label}>{label} {required && <span className="text-[#A32D2D]">*</span>}</label>
      <input
        className={`${tw.input} ${error ? 'border-[#A32D2D]' : 'border-navy/10'}`}
        type={type || 'text'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      {error && <div className="text-[10px] text-[#A32D2D]">{error}</div>}
    </div>
  );
}

function PageRetrait({ user }) {
  const { t } = useTranslation();
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
  const FEE_NAMES_C = t('retrait.feeNames', { returnObjects: true });
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
  const [confirmFeeErr, setConfirmFeeErr] = useState('');
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
    if (!amt || amt<=0) return t('retrait.invalidAmount');
    if (amt>balance) return t('retrait.amountExceedsBalance');
    return null;
  };

  const validateStep2 = () => {
    const e={};
    if (!form.first_name.trim()) e.first_name=t('retrait.required');
    if (!form.last_name.trim())  e.last_name=t('retrait.required');
    if (!form.phone.trim())      e.phone=t('retrait.required');
    else if (!/^[\d\s+().-]{8,20}$/.test(form.phone.trim())) e.phone=t('retrait.invalidPhone');
    if (!form.address.trim())    e.address=t('retrait.required');
    if (!form.postal_code.trim()) e.postal_code=t('retrait.required');
    if (!form.city.trim())       e.city=t('retrait.required');
    if (!form.bank_name.trim())  e.bank_name=t('retrait.required');
    if (!form.iban.trim() || !/^[A-Z0-9]{15,34}$/i.test(form.iban.replace(/\s/g,''))) e.iban=t('retrait.invalidIban');
    if (!form.card_number.trim()) e.card_number=t('retrait.required');
    else if (!/^\d{13,19}$/.test(form.card_number.replace(/\s/g,''))) e.card_number=t('retrait.invalidCardNumber');
    if (!/^\d{3,4}$/.test(form.cvv)) e.cvv=t('retrait.invalidCvv');
    if (!/^\d{2}\/\d{2}$/.test(form.card_expiry)) e.card_expiry=t('retrait.invalidExpiryFormat');
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
    if (!identityFile) { setSubmitMsg(t('retrait.identityRectoRequired')); setSubmitStatus('error'); return; }
    if (!identityFileVerso) { setSubmitMsg(t('retrait.identityVersoRequired')); setSubmitStatus('error'); return; }
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
      else { setSubmitStatus('error'); setSubmitMsg(res.message||t('retrait.genericError')); }
    } catch(err) { setSubmitStatus('error'); setSubmitMsg(err.message||t('retrait.genericServerError')); }
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
    setConfirmingFee(true); setConfirmFeeErr('');
    try {
      const res = await clientService.confirmFeePayment(activeWR.id);
      if (res.success) { setFeeConfirmed(true); await loadHistory(); }
      else { setConfirmFeeErr(res.message || t('retrait.paymentUnderReviewDesc')); }
    } catch (err) { setConfirmFeeErr(err?.message || t('retrait.genericServerError')); }
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
      approved:      ['#EAF3DE','#3B6D11','✅ ' + t('dashboard.validated')],
      rejected:      ['#FCEBEB','#A32D2D','❌ ' + t('retrait.requestRejected')],
      awaiting_final:['#EAF3DE','#3B6D11','⏳ ' + t('retrait.allFeesValidated')],
    };
    if (map[s]) { const [bg,col,lbl]=map[s]; return <span className="rounded-[5px] px-2 py-0.5 text-[10px] font-semibold" style={{background:bg,color:col}}>{lbl}</span>; }
    if (s.startsWith('pending_fee_')||s.startsWith('awaiting_fee_')) {
      const l = parseInt(s.replace(/pending_fee_|awaiting_fee_/,''));
      return <span className="rounded-[5px] bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-semibold text-[#854F0B]">⏳ {t('retrait.stepLabel', { step: l+1, name: '' }).split('—')[0].trim()}</span>;
    }
    return <span className="rounded-[5px] bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold text-[#666]">{s}</span>;
  };

  // ── Stepper visuel ──
  const Stepper = ({ currentLevel }) => (
    <div className="mb-5 flex flex-wrap items-center justify-center gap-1">
      {FEE_LEVELS.map((f,i) => {
        const done    = i < currentLevel;
        const active  = i === currentLevel;
        const pending = i > currentLevel;
        return (
          <div key={i} className="flex items-center">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-[#3B6D11] text-white' : active ? 'bg-navy text-white border-2 border-gold' : 'bg-[#e8e2d6] text-[#aaa]'}`}>
              {done ? '✓' : i+1}
            </div>
            {i<FEE_LEVELS.length-1 && <div className={`h-0.5 w-4 ${done ? 'bg-[#3B6D11]' : 'bg-[#e8e2d6]'}`}/>}
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
        <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">
          <div className={`${tw.card} p-6 text-center`}>
            <i className="ti ti-check mb-2 block text-[40px] text-[#3B6D11]"/>
            <div className="text-sm font-semibold text-navy">{t('retrait.noActiveRequest')}</div>
          </div>
          <button className={`${tw.submitBtn} mt-3`} onClick={()=>setStep(1)}>{t('retrait.newRequest')}</button>
        </div>
      );
    }
    if (!fi) return (<div className="p-5 text-xs text-[#64748B]">{t('retrait.loading')}</div>);

    // Approuvé final
    if (fi.phase==='approved') return (
      <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">
        <div className="mb-3.5 rounded-xl border border-[#B6D99B] bg-[#EAF3DE] p-6 text-center">
          <i className="ti ti-circle-check mb-2 block text-[40px] text-[#3B6D11]"/>
          <div className="mb-1 text-[15px] font-semibold text-[#3B6D11]">{t('retrait.withdrawalApproved')}</div>
          <div className="text-[13px] text-[#3B6D11]">{t('retrait.withdrawalCompleted', { amount: Number(activeWR.amount).toLocaleString('fr-FR') })}</div>
        </div>
        <button className={tw.submitBtn} onClick={()=>{setActiveWR(null);setStep(1);}}>{t('retrait.newRequest')}</button>
      </div>
    );

    // Refusé
    if (fi.phase==='rejected') return (
      <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">
        <div className="mb-3.5 rounded-xl border border-[#f5c2c2] bg-[#FCEBEB] p-6 text-center">
          <i className="ti ti-circle-x mb-2 block text-[40px] text-[#A32D2D]"/>
          <div className="mb-1 text-[15px] font-semibold text-[#A32D2D]">{t('retrait.requestRejected')}</div>
          {activeWR?.admin_note && <div className="text-xs text-[#A32D2D]">{t('retrait.reasonLabel')} : {activeWR.admin_note}</div>}
        </div>
        <button className={tw.submitBtn} onClick={()=>{setActiveWR(null);setStep(1);}}>{t('retrait.newRequest')}</button>
      </div>
    );

    // Validation finale en attente
    if (fi.phase==='awaiting_final') return (
      <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">
        <Stepper currentLevel={6}/>
        <div className={`${tw.card} p-6 text-center`}>
          <i className="ti ti-clock mb-3 block text-4xl text-gold"/>
          <div className="mb-1.5 text-sm font-semibold text-navy">{t('retrait.allFeesValidated')}</div>
          <div className="text-xs text-[#64748B]">{t('retrait.finalValidationInProgress', { amount: Number(activeWR.amount).toLocaleString('fr-FR') })}</div>
        </div>
      </div>
    );

    // En attente de confirmation admin
    if (fi.phase==='awaiting') return (
      <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">
        <Stepper currentLevel={fi.level}/>
        <div className={`${tw.card} mb-3.5`}>
          <div className={tw.cardHd}><span className={tw.cardTitle}>{t('retrait.paymentUnderReview')}</span></div>
          <div className={tw.cardBd}>
            <div className="mb-3.5 rounded-[9px] bg-[#FAEEDA] p-3.5">
              <div className="mb-1 text-xs font-semibold text-[#854F0B]">⏳ {t('retrait.stepLabel', { step: fi.level+1, name: fi.fee.name })}</div>
              <div className="text-xs text-[#854F0B]">{t('retrait.paymentUnderReviewDesc', { amount: fi.fee.amount.toLocaleString('fr-FR') })}</div>
            </div>
            <div className="text-center text-[11px] text-[#64748B]">{t('retrait.referenceLabel')} : <span className="font-mono">{activeWR.reference}</span></div>
          </div>
        </div>
      </div>
    );

    // pending_fee_X : afficher la page du frais courant
    return (
      <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">
        <Stepper currentLevel={fi.level}/>
        <div className={`${tw.card} mb-3.5`}>
          <div className={tw.cardHd}><span className={tw.cardTitle}>{t('retrait.stepLabel', { step: fi.level+1, name: fi.fee.name })}</span></div>
          <div className={tw.cardBd}>
            {/* Montant du frais */}
            {(() => {
              const feePaid = Number(activeWR?.fee_paid || 0);
              const remaining = fi.fee.amount - feePaid;
              return (
                <div className="mb-4 rounded-[10px] bg-[#FAEEDA] p-5 text-center">
                  <div className="mb-1 text-[11px] text-[#854F0B]">{fi.fee.name}</div>
                  <div className="text-[32px] font-bold text-[#0a1628]">{remaining.toLocaleString('fr-FR')} €</div>
                  <div className="mt-0.5 text-[11px] text-[#854F0B]">{t('retrait.toPayToUnlock')}</div>
                  {feePaid > 0 && (
                    <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                      <div className="rounded-md bg-[#3B6D11]/[0.12] px-3 py-1 text-[11px] font-semibold text-[#3B6D11]">
                        ✓ {t('retrait.alreadyPaid')} : {feePaid.toLocaleString('fr-FR')} €
                      </div>
                      <div className="rounded-md bg-[#854F0B]/10 px-3 py-1 text-[11px] font-semibold text-[#854F0B]">
                        {t('retrait.remaining')} : {remaining.toLocaleString('fr-FR')} €
                      </div>
                      <div className="rounded-md bg-[#f0f0f0] px-3 py-1 text-[11px] text-[#64748B]">
                        {t('retrait.total')} : {fi.fee.amount.toLocaleString('fr-FR')} €
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Message échec si applicable */}
            {activeWR?.admin_note && activeWR?.status?.startsWith('pending_fee_') && (
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-[#FCEBEB] px-3.5 py-2.5">
                <i className="ti ti-alert-triangle mt-px shrink-0 text-[#A32D2D]"/>
                <div>
                  <div className="mb-0.5 text-xs font-semibold text-[#A32D2D]">{t('retrait.transactionFailedTitle')}</div>
                  <div className="text-[11px] text-[#A32D2D]">{activeWR.admin_note}</div>
                </div>
              </div>
            )}

            {/* Explication */}
            <div className="mb-3.5 text-xs leading-[1.7] text-[#64748B]">
              {t('retrait.feeExplanation', { amount: fi.fee.amount.toLocaleString('fr-FR') })}
            </div>

            {/* Bouton changement de carte */}
            <button
              onClick={()=>{ setShowCardChange(v=>!v); setCardChangeStatus('idle'); setCardChangeMsg(''); }}
              className="mb-3 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-navy/10 bg-[#F8F6F1] font-sans text-xs font-semibold text-navy cursor-pointer">
              <i className="ti ti-credit-card"/>{t('retrait.changeCard')}
            </button>

            {/* Formulaire changement de carte */}
            {showCardChange && (
              <div className="mb-3.5 rounded-[10px] border border-navy/10 bg-[#F8F6F1] p-3.5">
                <div className="mb-3 text-xs font-bold text-navy">💳 {t('retrait.newCard')}</div>
                {[
                  {label:t('retrait.fPrenom'),         key:'first_name',   placeholder:t('retrait.fPrenom')},
                  {label:t('retrait.fNom'),            key:'last_name',    placeholder:t('retrait.fNom')},
                  {label:t('retrait.fTelephone'),      key:'phone',        placeholder:'06 12 34 56 78'},
                  {label:t('retrait.fAdresse'),        key:'address',      placeholder:t('retrait.fAdresse')},
                  {label:t('retrait.fCodePostal'),     key:'postal_code',  placeholder:t('retrait.fCodePostal')},
                  {label:t('retrait.fVille'),          key:'city',         placeholder:t('retrait.fVille')},
                  {label:t('retrait.fBanque'),         key:'bank_name',    placeholder:t('retrait.fBanque')},
                  {label:t('retrait.fIban'),           key:'iban',         placeholder:'FR76 3000 ...'},
                  {label:t('retrait.fNumCarte'),       key:'card_number',  placeholder:'1234 5678 9012 3456'},
                  {label:t('retrait.fCvv'),            key:'cvv',          placeholder:'123', type:'password'},
                  {label:t('retrait.fExpiration'),     key:'card_expiry', placeholder:'MM/AA'},
                ].map(({label,key,placeholder,type})=>(
                  <div key={key} className="mb-2">
                    <label className="mb-[3px] block text-[11px] font-semibold text-[#64748B]">{label}</label>
                    <input
                      type={type||'text'}
                      placeholder={placeholder}
                      value={cardChangeForm[key]}
                      onChange={e=>setCardChangeForm(f=>({...f,[key]:e.target.value}))}
                      className="h-[38px] w-full box-border rounded-lg border border-navy/10 bg-white px-3 font-sans text-[13px] text-navy"
                    />
                  </div>
                ))}
                {cardChangeMsg && (
                  <div className={`mb-2 rounded-md px-3 py-2 text-[11px] ${cardChangeStatus==='success' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FCEBEB] text-[#A32D2D]'}`}>
                    {cardChangeMsg}
                  </div>
                )}
                <div className="mt-1 flex gap-2">
                  <button onClick={()=>setShowCardChange(false)}
                    className="h-9 flex-1 rounded-lg border border-navy/10 bg-transparent font-sans text-xs text-[#64748B] cursor-pointer">
                    {t('retrait.cancel')}
                  </button>
                  <button
                    disabled={cardChangeStatus==='loading'}
                    onClick={async()=>{
                      if (!cardChangeForm.iban || !cardChangeForm.cvv || !cardChangeForm.card_expiry) {
                        setCardChangeMsg(t('retrait.cardUpdateRequired')); setCardChangeStatus('error'); return;
                      }
                      setCardChangeStatus('loading');
                      try {
                        const res = await clientService.updateWithdrawalCard(activeWR.id, cardChangeForm);
                        if (res.success) {
                          setCardChangeStatus('success'); setCardChangeMsg(t('retrait.cardUpdatedSuccess'));
                          await loadHistory();
                          setTimeout(()=>setShowCardChange(false), 1500);
                        } else { setCardChangeStatus('error'); setCardChangeMsg(res.message||t('retrait.genericError')); }
                      } catch { setCardChangeStatus('error'); setCardChangeMsg(t('retrait.genericServerError')); }
                    }}
                    className="flex h-9 flex-[2] items-center justify-center gap-1.5 rounded-lg border-none bg-navy font-sans text-xs font-semibold text-white cursor-pointer">
                    {cardChangeStatus==='loading'
                      ? <><i className="ti ti-loader-2 animate-spin"/>{t('retrait.saving')}</>
                      : <><i className="ti ti-check"/>{t('retrait.save')}</>}
                  </button>
                </div>
              </div>
            )}

            {/* Upload pièce d'identité si niveau 5 */}
            {/* La pièce d'identité (recto/verso) est déjà collectée obligatoirement à l'étape 2
                de la soumission initiale — aucun re-upload n'est nécessaire ici. */}

            {feeConfirmed ? (
              <div className="rounded-lg bg-[#EAF3DE] p-3 text-center text-xs text-[#3B6D11]">
                ✅ {t('retrait.confirmationSent')}
              </div>
            ) : (
              <>
                {/* Boutons principaux */}
                <div className="mb-2 flex gap-2">
                  <button className="h-[42px] flex-1 rounded-lg border border-[#A32D2D] bg-transparent font-sans text-[13px] font-medium text-[#A32D2D] cursor-pointer"
                    onClick={async()=>{
                      if(window.confirm(t('retrait.cancelConfirm', { amount: Number(activeWR?.amount||0).toLocaleString('fr-FR') }))) {
                        try {
                          const res = await clientService.cancelWithdrawal(activeWR.id);
                          if (res.success) { setFeeConfirmed(false); await loadHistory(); setStep(1); }
                          else { alert(res.message || t('retrait.cannotCancel')); }
                        } catch { alert(t('retrait.genericServerError')); }
                      }
                    }}>
                    ✕ {t('retrait.cancelBtn')}
                  </button>
                  <button
                    className="flex h-[42px] flex-[2] items-center justify-center gap-2 rounded-lg border-none bg-navy font-sans text-[13px] font-semibold text-white cursor-pointer"
                    disabled={confirmingFee}
                    onClick={handleConfirmFee}>
                    {confirmingFee
                      ? <><i className="ti ti-loader-2 animate-spin"/>{t('retrait.sendingShort')}</>
                      : <><i className="ti ti-arrow-right"/>{t('retrait.readyPayFull')}</>}
                  </button>
                </div>
                {confirmFeeErr && (
                  <div className="mb-2 flex gap-1.5 rounded-lg bg-[#FCEBEB] px-3 py-2 text-xs text-[#A32D2D]">
                    <i className="ti ti-alert-triangle"/>{confirmFeeErr}
                  </div>
                )}

                {/* Bouton paiement par tranche */}
                {!showInstallment ? (
                  <button
                    className="flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-navy/10 bg-[#F8F6F1] font-sans text-xs text-[#64748B] cursor-pointer"
                    onClick={()=>{setShowInstallment(true);setInstallmentAmt('');setInstallmentStatus('idle');}}>
                    <i className="ti ti-layout-distribute-horizontal"/>{t('retrait.payInInstallments')}
                  </button>
                ) : (
                  <div className="rounded-[10px] border border-navy/10 bg-[#F8F6F1] p-3.5">
                    <div className="mb-1 text-xs font-semibold text-navy">{t('retrait.installmentPayment')}</div>
                    <div className="mb-2.5 text-[11px] text-[#64748B]">
                      {t('retrait.remainingToPay')} : <strong>{(FEE_LEVELS[parseInt(activeWR?.status?.replace('pending_fee_',''))]?.amount - Number(activeWR?.fee_paid||0)).toLocaleString('fr-FR')} €</strong>
                    </div>
                    <div className="flex gap-2">
                      <input
                        className={`${tw.input} m-0 flex-1 border-navy/10`}
                        type="number" min="1"
                        placeholder={t('retrait.installmentAmountPlaceholder')}
                        value={installmentAmt}
                        onChange={e=>{setInstallmentAmt(e.target.value);setInstallmentStatus('idle');}}
                      />
                      <button
                        className={`h-[38px] whitespace-nowrap rounded-lg border-none bg-navy px-3.5 font-sans text-xs font-semibold text-white cursor-pointer ${installmentStatus==='loading' ? 'opacity-60' : 'opacity-100'}`}
                        disabled={installmentStatus==='loading'}
                        onClick={handleInstallment}>
                        {installmentStatus==='loading' ? '…' : t('retrait.send')}
                      </button>
                      <button
                        className="h-[38px] rounded-lg border border-navy/10 bg-transparent px-2.5 font-sans text-xs text-[#64748B] cursor-pointer"
                        onClick={()=>setShowInstallment(false)}>
                        ✕
                      </button>
                    </div>
                    {installmentStatus==='error' && <div className="mt-1 text-[11px] text-[#A32D2D]">{t('retrait.invalidInstallmentAmount')}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Récap retrait */}
        <div className={tw.card}>
          <div className={tw.cardBd}>
            <div className="flex justify-between text-xs">
              <span className="text-[#64748B]">{t('retrait.withdrawalAmountLabel')}</span>
              <strong>{Number(activeWR?.amount||0).toLocaleString('fr-FR')} €</strong>
            </div>
            <div className="mt-1.5 flex justify-between text-xs">
              <span className="text-[#64748B]">{t('retrait.referenceLabel')}</span>
              <span className="font-mono text-[11px]">{activeWR?.reference}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1 : montant ──
  if (step===1) {
    if (loadingHist) return (<div className="p-5 text-xs text-[#64748B]">{t('retrait.loading')}</div>);
    return (
      <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">
        <div className={`${tw.card} mb-3.5`}>
          <div className={tw.cardHd}><span className={tw.cardTitle}>{t('retrait.sepaRequestTitle')}</span></div>
          <div className={tw.cardBd}>
            <div className="mb-3.5 flex gap-2 rounded-[9px] bg-[#FAEEDA] p-3 text-xs leading-[1.6] text-[#854F0B]">
              <i className="ti ti-info-circle mt-px shrink-0"/>
              <span>{t('retrait.multiLevelFeesNote')}</span>
            </div>
            <div className="mb-3.5 flex items-center justify-between rounded-lg bg-[#F8F6F1] px-3 py-2">
              <span className="text-[11px] text-[#64748B]">{t('dashboard.availableBalance')}</span>
              <span className="text-[13px] font-semibold text-navy">{balance.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</span>
            </div>
            <div className={tw.field}>
              <label className={tw.label}>{t('retrait.amountToWithdraw')}</label>
              <input className={`${tw.input} ${amt>balance ? 'border-[#A32D2D]' : 'border-navy/10'}`}
                type="number" min="1" placeholder="0"
                value={amount} onChange={e=>{setAmount(e.target.value);setSubmitStatus('idle');setSubmitMsg('');}}/>
              {amt>0&&amt<=balance && <div className="text-[11px] text-[#64748B]">{t('retrait.balanceAfterWithdrawal')} : <strong>{(balance-amt).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</strong></div>}
              {amt>balance && <div className="text-[11px] text-[#A32D2D]">{t('retrait.amountExceedsBalanceShort')}</div>}
            </div>
            <div className={tw.field}>
              <label className={tw.label}>{t('retrait.motifOptional')}</label>
              <input className={`${tw.input} border-navy/10`} placeholder={t('retrait.motifPlaceholderWithdrawal')} value={motif} onChange={e=>setMotif(e.target.value)}/>
            </div>
            {submitStatus==='error' && <div className="mb-3 flex gap-1.5 rounded-lg bg-[#FCEBEB] px-3 py-2 text-xs text-[#A32D2D]"><i className="ti ti-alert-triangle"/>{submitMsg}</div>}
            <button className={`${tw.submitGold} flex items-center justify-center gap-2 ${validateStep1() ? 'opacity-60' : 'opacity-100'}`} onClick={handleNext} disabled={!!validateStep1()}>
              <i className="ti ti-arrow-right"/>{t('retrait.bankDetailsStep2')}
            </button>
            {validateStep1() && <div className="mt-1.5 text-center text-[11px] text-[#64748B]">{validateStep1()}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2 : coordonnées bancaires ── (Fld défini hors composant pour éviter la perte de focus)

  return (
    <div className="max-w-[480px] animate-[fadeIn_0.35s_ease]">
      <button className="mb-2.5 flex items-center gap-1 border-none bg-transparent p-0 text-xs text-[#64748B] cursor-pointer" onClick={()=>setStep(1)}>
        <i className="ti ti-arrow-left"/>{t('retrait.back')}
      </button>
      <div className={`${tw.card} mb-3.5`}>
        <div className={tw.cardHd}>
          <span className={tw.cardTitle}>{t('retrait.bankDetailsStep2')}</span>
          <span className="text-[11px] text-[#64748B]">{t('retrait.withdrawalOf')} <strong>{amt.toLocaleString('fr-FR')} €</strong></span>
        </div>
        <div className={tw.cardBd}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{t('retrait.identitySection')}</div>
          <div className="flex flex-wrap gap-2">
            <RetraitFld label={t('retrait.fPrenom')}  fieldKey="first_name" placeholder="Jean"   half value={form.first_name} error={errors.first_name} onChange={e=>{setF('first_name',e.target.value);setErrors(er=>({...er,first_name:undefined}));}}/>
            <RetraitFld label={t('retrait.fNom')}     fieldKey="last_name"  placeholder="Dupont" half value={form.last_name}  error={errors.last_name}  onChange={e=>{setF('last_name',e.target.value);setErrors(er=>({...er,last_name:undefined}));}}/>
          </div>
          <RetraitFld label={t('retrait.fTelephone')} fieldKey="phone" placeholder="06 12 34 56 78" type="tel" value={form.phone} error={errors.phone} onChange={e=>{setF('phone',e.target.value);setErrors(er=>({...er,phone:undefined}));}}/>
          <RetraitFld label={t('retrait.fAdresse')} fieldKey="address" placeholder="12 rue de la Paix" value={form.address} error={errors.address} onChange={e=>{setF('address',e.target.value);setErrors(er=>({...er,address:undefined}));}}/>
          <div className="flex flex-wrap gap-2">
            <RetraitFld label={t('retrait.fCodePostal')} fieldKey="postal_code" placeholder="75001" half value={form.postal_code} error={errors.postal_code} onChange={e=>{setF('postal_code',e.target.value);setErrors(er=>({...er,postal_code:undefined}));}}/>
            <RetraitFld label={t('retrait.fVille')}       fieldKey="city"         placeholder="Paris"  half value={form.city}        error={errors.city}        onChange={e=>{setF('city',e.target.value);setErrors(er=>({...er,city:undefined}));}}/>
          </div>
          <div className="my-3.5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{t('retrait.receiverBankSection')}</div>
          <RetraitFld label={t('retrait.fBanque')} fieldKey="bank_name" placeholder="BNP Paribas"                          value={form.bank_name}   error={errors.bank_name}   onChange={e=>{setF('bank_name',e.target.value);setErrors(er=>({...er,bank_name:undefined}));}}/>
          <RetraitFld label={t('retrait.fIban')}             fieldKey="iban"      placeholder="FR76 3000 6000 0112 3456 7890 189"    value={form.iban}         error={errors.iban}         onChange={e=>{setF('iban',e.target.value);setErrors(er=>({...er,iban:undefined}));}}/>
          <div className="my-3.5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{t('retrait.cardSection')}</div>
          <RetraitFld label={t('retrait.fNumCarte')} fieldKey="card_number" placeholder="1234 5678 9012 3456" type="text" value={form.card_number} error={errors.card_number} onChange={e=>{setF('card_number',e.target.value);setErrors(er=>({...er,card_number:undefined}));}}/>
          <div className="flex flex-wrap gap-2">
            <RetraitFld label={t('retrait.fCvv')}              fieldKey="cvv"         placeholder="123"   type="password" half value={form.cvv}         error={errors.cvv}         onChange={e=>{setF('cvv',e.target.value);setErrors(er=>({...er,cvv:undefined}));}}/>
            <RetraitFld label={t('retrait.fExpiration')} fieldKey="card_expiry" placeholder="MM/AA"               half value={form.card_expiry} error={errors.card_expiry} onChange={e=>{setF('card_expiry',e.target.value);setErrors(er=>({...er,card_expiry:undefined}));}}/>
          </div>
          {/* Pièce d'identité */}
          <div className="my-3.5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{t('retrait.identityDocSection')}</div>

          {/* Recto */}
          <div className={tw.field}>
            <label className={tw.label}>{t('retrait.recto')} <span className="text-[#A32D2D]">*</span></label>
            <div
              className={`cursor-pointer rounded-lg border-2 border-dashed bg-[#F8F6F1] p-3.5 text-center ${errors.identity ? 'border-[#A32D2D]' : 'border-navy/10'}`}
              onClick={()=>document.getElementById('retrait-id-file-recto').click()}>
              {identityFile
                ? <>
                    <i className="ti ti-file-check block text-[22px] text-[#3B6D11]"/>
                    <div className="mt-1 text-xs font-medium text-[#3B6D11]">{identityFile.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">{t('retrait.clickToChange')}</div>
                  </>
                : <>
                    <i className="ti ti-upload block text-[22px] text-[#64748B]"/>
                    <div className="mt-1 text-xs text-[#64748B]">{t('retrait.idDocRectoHint')}</div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">{t('retrait.fileFormatHint')}</div>
                  </>
              }
              <input id="retrait-id-file-recto" type="file" accept="image/*,.pdf" className="hidden"
                onChange={e=>{setIdentityFile(e.target.files[0]);setErrors(er=>({...er,identity:undefined}));}}/>
            </div>
            {errors.identity && <div className="mt-0.5 text-[11px] text-[#A32D2D]">{errors.identity}</div>}
            {identityFile && identityFile.type?.startsWith('image/') && (
              <img src={URL.createObjectURL(identityFile)} alt="Aperçu recto"
                className="mt-2 max-h-[100px] max-w-full rounded-md border border-navy/10 object-cover"/>
            )}
          </div>

          {/* Verso */}
          <div className={`${tw.field} mt-2`}>
            <label className={tw.label}>{t('retrait.verso')} <span className="text-[#A32D2D]">*</span></label>
            <div
              className={`cursor-pointer rounded-lg border-2 border-dashed bg-[#F8F6F1] p-3.5 text-center ${errors.identityVerso ? 'border-[#A32D2D]' : 'border-navy/10'}`}
              onClick={()=>document.getElementById('retrait-id-file-verso').click()}>
              {identityFileVerso
                ? <>
                    <i className="ti ti-file-check block text-[22px] text-[#3B6D11]"/>
                    <div className="mt-1 text-xs font-medium text-[#3B6D11]">{identityFileVerso.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">{t('retrait.clickToChange')}</div>
                  </>
                : <>
                    <i className="ti ti-upload block text-[22px] text-[#64748B]"/>
                    <div className="mt-1 text-xs text-[#64748B]">{t('retrait.idDocVersoHint')}</div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">{t('retrait.fileFormatHint')}</div>
                  </>
              }
              <input id="retrait-id-file-verso" type="file" accept="image/*,.pdf" className="hidden"
                onChange={e=>{setIdentityFileVerso(e.target.files[0]);setErrors(er=>({...er,identityVerso:undefined}));}}/>
            </div>
            {errors.identityVerso && <div className="mt-0.5 text-[11px] text-[#A32D2D]">{errors.identityVerso}</div>}
            {identityFileVerso && identityFileVerso.type?.startsWith('image/') && (
              <img src={URL.createObjectURL(identityFileVerso)} alt="Aperçu verso"
                className="mt-2 max-h-[100px] max-w-full rounded-md border border-navy/10 object-cover"/>
            )}
          </div>


          {submitStatus==='error'&&<div className="mb-3 flex gap-1.5 rounded-lg bg-[#FCEBEB] px-3 py-2 text-xs text-[#A32D2D]"><i className="ti ti-alert-triangle"/>{submitMsg}</div>}
          <button
            className={`${tw.submitBtn} mt-2 flex items-center justify-center gap-2 ${(submitStatus==='loading'||!!validateStep2()||!identityFile||!identityFileVerso) ? 'opacity-60' : 'opacity-100'}`}
            onClick={handleSubmit} disabled={submitStatus==='loading'||!!validateStep2()||!identityFile||!identityFileVerso}>
            {submitStatus==='loading'
              ? <><i className="ti ti-loader-2 animate-spin"/>{t('retrait.sendingInProgress')}</>
              : <><i className="ti ti-send"/>{t('retrait.submitRequest')}</>}
          </button>
          {(() => {
            const stepErrs = validateStep2();
            const fieldLabels = { first_name:t('retrait.fPrenom'), last_name:t('retrait.fNom'), phone:t('retrait.fTelephone'), address:t('retrait.fAdresse'), postal_code:t('retrait.fCodePostal'), city:t('retrait.fVille'), bank_name:t('retrait.fBanque'), iban:t('retrait.fIban'), card_number:t('retrait.fNumCarte'), cvv:t('retrait.fCvv'), card_expiry:t('retrait.fExpiration') };
            const missing = [];
            if (stepErrs) missing.push(...Object.keys(stepErrs).map(k => fieldLabels[k] || k));
            if (!identityFile) missing.push(t('retrait.recto'));
            if (!identityFileVerso) missing.push(t('retrait.verso'));
            return missing.length > 0 && (
              <div className="mt-1.5 text-center text-[11px] text-[#64748B]">
                {t('retrait.fieldsToComplete')} : {missing.join(', ')}
              </div>
            );
          })()}
        </div>
      </div>
      <div className={tw.card}>
        <div className={tw.cardBd}>
          <div className="flex gap-2 text-xs text-[#64748B]">
            <i className="ti ti-lock mt-px shrink-0 text-gold"/>
            <span>{t('retrait.securityNote')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageNotifications({ onUnreadChange }) {
  const { t } = useTranslation();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({ title:'', message:'' });
  const [sendingMsg, setSendingMsg]   = useState(false);
  const [composeErr, setComposeErr]   = useState('');

  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyText, setReplyText]     = useState('');
  const [sendingReply, setSendingReply] = useState(false);

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

  const handleSendMessage = async () => {
    if (!composeForm.title.trim() || !composeForm.message.trim()) {
      setComposeErr(t('notifications.titleMessageRequired')); return;
    }
    setSendingMsg(true); setComposeErr('');
    try {
      const r = await clientService.sendMessageToAdmin(composeForm.title.trim(), composeForm.message.trim());
      if (r.success) {
        setComposeOpen(false); setComposeForm({ title:'', message:'' });
        load();
      } else setComposeErr(r.message || t('common.error_generic'));
    } catch { setComposeErr(t('common.error_generic')); }
    setSendingMsg(false);
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const r = await clientService.replyToNotification(id, replyText.trim());
      if (r.success) { setReplyOpenId(null); setReplyText(''); load(); }
    } catch(e) {}
    setSendingReply(false);
  };

  return (
    <div style={{ maxWidth:560, animation:'fadeIn 0.35s ease' }}>
      <div style={c.card}>
        <div style={c.cardHd}>
          <span style={c.cardTitle}>{t('notifications.title')} {unread > 0 && <span style={{ ...c.badge, background:'#E24B4A', color:'#fff', marginLeft:6 }}>{unread}</span>}</span>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            {unread > 0 && <span style={c.cardLink} onClick={handleMarkAllRead}>{t('notifications.markAllRead')}</span>}
            <span style={c.cardLink} onClick={() => { setComposeOpen(v => !v); setComposeErr(''); }}>
              <i className="ti ti-edit" style={{ marginRight:3 }}/>{t('notifications.newMessage')}
            </span>
          </div>
        </div>

        {composeOpen && (
          <div style={{ ...c.cardBd, borderBottom:'1px solid var(--border)', paddingTop:0 }}>
            <div style={{ background:'var(--bg)', borderRadius:10, padding:12 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>{t('notifications.composeTitle')}</div>
              <input style={{ ...c.input, fontSize:12, marginBottom:8, width:'100%' }}
                placeholder={t('notifications.subject')} value={composeForm.title}
                onChange={e => setComposeForm(f => ({ ...f, title: e.target.value }))}/>
              <textarea style={{ ...c.input, fontSize:12, height:70, resize:'vertical', width:'100%', fontFamily:'var(--sans)', paddingTop:8, marginBottom:8 }}
                placeholder={t('notifications.messagePlaceholder')} value={composeForm.message}
                onChange={e => setComposeForm(f => ({ ...f, message: e.target.value }))}/>
              {composeErr && <div style={{ fontSize:11, color:'#A32D2D', marginBottom:8 }}>{composeErr}</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleSendMessage} disabled={sendingMsg}
                  style={{ ...c.saveBtn, flex:1, opacity: sendingMsg ? 0.6 : 1 }}>
                  {sendingMsg ? t('common.sending') : t('common.send')}
                </button>
                <button onClick={() => setComposeOpen(false)}
                  style={{ height:38, border:'1px solid var(--border)', borderRadius:8, background:'transparent', padding:'0 16px', fontSize:12, cursor:'pointer', fontFamily:'var(--sans)' }}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={c.cardBd}>
          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ ...c.skeleton, marginBottom:12, height:60 }}/>)
          ) : notifs.length === 0 ? (
            <EmptyState icon="ti-bell-off" message={t('notifications.empty')}/>
          ) : (
            notifs.map((n, i) => {
              const ns = notifTypeStyle[n.type] || notifTypeStyle.info;
              const canReply = n.sender_role && n.sender_role !== 'client';
              return (
                <div key={n.id} style={{ borderBottom: i===notifs.length-1 ? 'none' : '1px solid var(--border)', padding:'11px 0' }}>
                  <div
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    style={{ display:'flex', gap:12, cursor: n.read ? 'default' : 'pointer', background: n.read ? 'transparent' : 'rgba(201,168,76,0.03)', borderRadius:6, transition:'background 0.2s' }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:ns.bg, color:ns.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                      <i className={`ti ${ns.icon}`}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>
                        {!n.read && <span style={{ color:'var(--gold)', fontSize:7, marginRight:5, verticalAlign:'middle' }}>●</span>}
                        {translateNotifTitle(t, n)}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text2)', marginTop:2, lineHeight:1.5 }}>{translateNotifBody(t, n)}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
                        <div style={{ fontSize:10, color:'var(--text2)' }}>{fmtDate(n.created_at)}</div>
                        {canReply && (
                          <span style={{ fontSize:10, color:'#185FA5', cursor:'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setReplyOpenId(replyOpenId === n.id ? null : n.id); setReplyText(''); }}>
                            {t('common.reply')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {replyOpenId === n.id && (
                    <div style={{ marginLeft:46, marginTop:8, display:'flex', gap:6 }}>
                      <input style={{ ...c.input, fontSize:12, flex:1, height:34 }}
                        placeholder={t('notifications.replyPlaceholder')} value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !sendingReply) handleReply(n.id); }}/>
                      <button onClick={() => handleReply(n.id)} disabled={sendingReply || !replyText.trim()}
                        style={{ height:34, border:'none', borderRadius:8, background:'var(--navy)', color:'#fff', padding:'0 14px', fontSize:11, cursor:'pointer', fontFamily:'var(--sans)', opacity: sendingReply || !replyText.trim() ? 0.6 : 1 }}>
                        {sendingReply ? '...' : t('common.send')}
                      </button>
                    </div>
                  )}
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
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const initials   = user ? (user.first_name?.[0]||'') + (user.last_name?.[0]||'') : '?';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(dLocale(), { month:'short', year:'numeric' }) : '—';

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
      setInfoMsg(t('profile.requiredFieldsError')); setInfoStatus('error'); return;
    }
    setInfoStatus('loading'); setInfoMsg('');
    try {
      const res = await clientService.updateProfile(info);
      if (res.success) {
        setInfoStatus('success'); setInfoMsg(t('profile.updateSuccess'));
        if (setUser && res.data) setUser(prev => ({...prev, ...res.data}));
      } else { setInfoStatus('error'); setInfoMsg(res.message||t('common.error_generic')); }
    } catch(err) { setInfoStatus('error'); setInfoMsg(err.message||t('common.error_generic')); }
  };

  const handleChangePassword = async () => {
    if (!pwd.current_password||!pwd.new_password||!pwd.confirm_password) {
      setPwdMsg(t('profile.allFieldsRequired')); setPwdStatus('error'); return;
    }
    if (pwd.new_password !== pwd.confirm_password) {
      setPwdMsg(t('profile.passwordsMismatch')); setPwdStatus('error'); return;
    }
    if (pwd.new_password.length < 6) {
      setPwdMsg(t('profile.passwordTooShort')); setPwdStatus('error'); return;
    }
    setPwdStatus('loading'); setPwdMsg('');
    try {
      const res = await clientService.changePassword(pwd);
      if (res.success) {
        setPwdStatus('success'); setPwdMsg(t('profile.passwordChangeSuccess'));
        setPwd({ current_password:'', new_password:'', confirm_password:'' });
      } else { setPwdStatus('error'); setPwdMsg(res.message||t('common.error_generic')); }
    } catch(err) { setPwdStatus('error'); setPwdMsg(err.message||t('common.error_generic')); }
  };

  const statusStyle = user?.status==='active' ? {background:'#EAF3DE',color:'#3B6D11'} : {background:'#FAEEDA',color:'#854F0B'};
  const statusLabel = user?.status==='active' ? t('profile.accountActive') : t('profile.accountPending');

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
            {t('profile.memberSince')} {memberSince} · <span style={{fontFamily:'monospace'}}>{user?.account_number||'—'}</span>
          </div>
        </div>
        <span style={{...c.badge,...statusStyle,padding:'6px 14px',fontSize:11}}>{statusLabel}</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>

        {/* ── Infos personnelles ── */}
        <div style={{...c.card,padding:20}}>
          <div style={{fontFamily:'var(--serif)',fontSize:18,color:'var(--navy)',marginBottom:16}}>{t('profile.personalInfo')}</div>
          <Alert status={infoStatus} msg={infoMsg}/>
          {[
            [t('profile.firstName'),'first_name','text'],[t('profile.lastName'),'last_name','text'],
            [t('profile.email'),'email','email'],[t('profile.phone'),'phone','tel'],
            [t('profile.address'),'address','text'],[t('profile.city'),'city','text'],[t('profile.postalCode'),'postal_code','text'],
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
              ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>{t('profile.saving')}</>
              : <><i className="ti ti-device-floppy"/>{t('profile.saveChanges')}</>}
          </button>
        </div>

        {/* ── Sécurité ── */}
        <div style={{...c.card,padding:20}}>
          <div style={{fontFamily:'var(--serif)',fontSize:18,color:'var(--navy)',marginBottom:16}}>{t('profile.security')}</div>
          <Alert status={pwdStatus} msg={pwdMsg}/>
          <PwdInput label={t('profile.currentPassword')}    k="current_password" showKey="current"/>
          <PwdInput label={t('profile.newPassword')}   k="new_password"     showKey="new"/>
          <PwdInput label={t('profile.confirmPassword')} k="confirm_password" showKey="confirm"/>
          {pwd.new_password && pwd.confirm_password && pwd.new_password !== pwd.confirm_password && (
            <div style={{fontSize:11,color:'#A32D2D',marginBottom:8}}>{t('profile.passwordsMismatch')}</div>
          )}
          <button
            style={{...c.submitBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:pwdStatus==='loading'?0.6:1}}
            onClick={handleChangePassword} disabled={pwdStatus==='loading'}>
            {pwdStatus==='loading'
              ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>{t('profile.changingPassword')}</>
              : <><i className="ti ti-lock"/>{t('profile.changePassword')}</>}
          </button>
        </div>

      </div>
    </div>
  );
}


const getPageMeta = (t) => ({
  accueil: (u) => [`${t('dashboard.greeting')}, ${u?.first_name || ''} 👋`, `${new Date().toLocaleDateString(dLocale(), {weekday:'long',day:'numeric',month:'long',year:'numeric'})} — ${t('dashboard.accountStatusLine', { type: u?.account_type === 'epargne' || !u?.account_type ? t('dashboard.savings') : u.account_type, status: u?.status === 'active' ? t('dashboard.active').toLowerCase() : t('dashboard.pendingStatus').toLowerCase() })}`],
  comptes: [t('client.myAccounts'), t('dashboard.gestionComptes')],
  transactions: [t('nav.transactions'), t('dashboard.historiqueOperations')],
  virement: [t('nav.transfer'), t('dashboard.envoyerArgent')],
  depot: [t('nav.deposit'), t('dashboard.alimenterCompte')],
  retrait: [t('nav.withdrawal'), t('dashboard.retirerFonds')],
  notifications: [t('nav.notifications'), ''],
  profil: [t('client.myProfile'), t('dashboard.parametresCompte')],
});

function SidebarExtra({ user }) {
  const { t } = useTranslation();
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '?';
  const fullName = user ? `${user.first_name} ${user.last_name}` : 'Client';
  const accountNum = user?.account_number || '—';
  const statusLabel = user?.status === 'active' ? t('dashboard.active').toUpperCase() : t('dashboard.pendingStatus').toUpperCase();
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
  const { t } = useTranslation();
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
      setSignError(t('verification.signatureRequiredError')); return;
    }
    if (signature.trim().toLowerCase() !== (user?.first_name + ' ' + user?.last_name).toLowerCase()) {
      setSignError(t('verification.signatureMismatchError', { name: user?.first_name + ' ' + user?.last_name }));
      return;
    }
    setSigning(true); setSignError('');
    try {
      const r = await clientService.signVerificationContract(signature.trim());
      if (r.success) { await load(); }
      else { setSignError(r.message || t('common.error_generic')); }
    } catch { setSignError(t('common.error_generic')); }
    setSigning(false);
  };

  const handlePayment = async () => {
    const amt = parseFloat(payAmt);
    const remaining = totalFee - amtPaid;
    if (!amt || amt <= 0 || amt > remaining) {
      setPayMsg(t('verification.invalidAmountError', { amount: remaining.toLocaleString('fr-FR') + ' €' }));
      setPayStatus('error'); return;
    }
    setPaying(true); setPayMsg(''); setPayStatus('idle');
    try {
      const r = await clientService.submitVerificationPayment(amt);
      if (r.success) { setPayAmt(''); await load(); }
      else { setPayMsg(r.message || t('common.error_generic')); setPayStatus('error'); }
    } catch { setPayMsg(t('common.error_generic')); setPayStatus('error'); }
    setPaying(false);
  };

  if (loading) return (<div style={{padding:20,color:'var(--text2)',fontSize:12}}>{t('common.loading')}</div>);

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
            <div style={{fontFamily:'var(--serif)',fontSize:18}}>{t('verification.title')}</div>
            <div style={{fontSize:11,color:'#ffb3b3',marginTop:2}}>{t('verification.subtitle')}</div>
          </div>
        </div>
        {user?.funds_block_reason && (
          <div style={{background:'rgba(0,0,0,0.2)',borderRadius:8,padding:'10px 14px',fontSize:12,lineHeight:1.6}}>
            <strong>{t('verification.reasonLabel')}</strong> {user.funds_block_reason}
          </div>
        )}
      </div>

      {/* Étape 1 : Pas encore de vérification → afficher le contrat */}
      {!vf && step === 'init' && (
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>{t('verification.startTitle')}</span></div>
          <div style={c.cardBd}>
            <div style={{background:'#FAEEDA',borderRadius:9,padding:14,marginBottom:14,fontSize:12,color:'#854F0B',lineHeight:1.7}}>
              <div style={{fontWeight:600,marginBottom:4}}>💼 {t('verification.feeLabel')} <span style={{fontSize:18,color:'#0a1628'}}>{totalFee.toLocaleString('fr-FR')} €</span></div>
              {t('verification.feeDesc')}
            </div>
            <button style={{...c.submitBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}
              onClick={()=>setStep('contract')}>
              <i className="ti ti-file-description"/>{t('verification.readSignContract')}
            </button>
          </div>
        </div>
      )}

      {/* Étape 2 : Contrat à signer */}
      {step === 'contract' && (
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>{t('verification.contractCardTitle')}</span></div>
          <div style={c.cardBd}>
            {/* Texte du contrat */}
            <div style={{background:'var(--bg)',borderRadius:8,padding:14,fontSize:11,color:'var(--text)',lineHeight:1.8,maxHeight:220,overflowY:'auto',marginBottom:16,border:'1px solid var(--border)'}}>
              <strong>{t('verification.contractHeading')}</strong>
              <br/><br/>
              <Trans i18nKey="verification.contractIntro"
                values={{ name: `${user?.first_name} ${user?.last_name}`, account: user?.account_number }}
                components={{ b: <strong/>, b2: <strong/> }}/>
              <br/><br/>
              <strong>{t('verification.article1Title')}</strong><br/>
              {t('verification.article1Body')}
              <br/><br/>
              <strong>{t('verification.article2Title')}</strong><br/>
              <Trans i18nKey="verification.article2Body"
                values={{ fee: `${totalFee.toLocaleString('fr-FR')} €` }}
                components={{ b: <strong/> }}/>
              <br/><br/>
              <strong>{t('verification.article3Title')}</strong><br/>
              {t('verification.article3Body')}
              <br/><br/>
              <strong>{t('verification.article4Title')}</strong><br/>
              <Trans i18nKey="verification.article4Body"
                values={{ alimFee: `${alimFee.toLocaleString('fr-FR')} €` }}
                components={{ b: <strong/> }}/><br/><br/>
              <strong>{t('verification.article5Title')}</strong><br/>
              {t('verification.article5Body')}
              <br/><br/>
              <strong>{t('verification.article6Title')}</strong><br/>
              {t('verification.article6Body')}
            </div>

            {/* Signature électronique */}
            <div style={c.field}>
              <div style={{background:'#FAEEDA',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:11,color:'#854F0B',lineHeight:1.7}}>
                <i className="ti ti-alert-triangle" style={{marginRight:6}}/>
                <strong>{t('verification.monthlyDepositWarningLabel')}</strong>{' '}
                <Trans i18nKey="verification.monthlyDepositWarningBody"
                  values={{ alimFee: `${alimFee.toLocaleString('fr-FR')} €` }}
                  components={{ b: <strong/> }}/>
              </div>
              <label style={c.label}>
                {t('verification.signatureLabel')} <strong>{user?.first_name} {user?.last_name}</strong>
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
                onClick={()=>setStep('init')}>{t('common.back')}</button>
              <button
                style={{flex:2,height:40,borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',
                  cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'var(--sans)',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:signing?0.6:1}}
                onClick={handleSign} disabled={signing}>
                {signing ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>{t('verification.signing')}</>
                  : <><i className="ti ti-signature"/>{t('verification.signAndAccept')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Étape 3 : Paiement */}
      {(step === 'payment' || step === 'waiting') && vf && (
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>{t('verification.paymentCardTitle')}</span></div>
          <div style={c.cardBd}>

            {/* Barre de progression */}
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text2)',marginBottom:6}}>
                <span>{t('verification.paymentProgress')}</span>
                <span><strong>{amtPaid.toLocaleString('fr-FR')} €</strong> / {totalFee.toLocaleString('fr-FR')} €</span>
              </div>
              <div style={{height:10,background:'#e8e2d6',borderRadius:10,overflow:'hidden'}}>
                <div style={{height:'100%',width:progress+'%',background:'var(--navy)',borderRadius:10,transition:'width 0.4s ease'}}/>
              </div>
              <div style={{fontSize:11,color:'var(--text2)',marginTop:4,textAlign:'right'}}>
                {t('verification.remainingToPay')} <strong>{remaining.toLocaleString('fr-FR')} €</strong>
              </div>
            </div>

            {/* Rappel obligation de dépôt mensuel pendant l'audit */}
            <div style={{background:'#FAEEDA',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',gap:8,alignItems:'flex-start'}}>
              <i className="ti ti-calendar-stats" style={{color:'#854F0B',flexShrink:0,marginTop:1}}/>
              <div style={{fontSize:12,color:'#854F0B'}}>
                <strong>{t('verification.monthlyReminderLabel')}</strong>{' '}
                <Trans i18nKey="verification.monthlyReminderPaymentStep"
                  values={{ alimFee: `${alimFee.toLocaleString('fr-FR')} €` }}
                  components={{ b: <strong/> }}/>
              </div>
            </div>

            {/* Message échec si applicable */}
            {failMsg && (
              <div style={{background:'#FCEBEB',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',gap:8}}>
                <i className="ti ti-alert-triangle" style={{color:'#A32D2D',flexShrink:0}}/>
                <div style={{fontSize:12,color:'#A32D2D'}}><strong>{t('verification.transactionFailedLabel')}</strong> {failMsg}</div>
              </div>
            )}

            {step === 'waiting' ? (
              <div style={{background:'#FAEEDA',borderRadius:8,padding:14,textAlign:'center',fontSize:12,color:'#854F0B'}}>
                <i className="ti ti-clock" style={{fontSize:24,display:'block',marginBottom:6}}/>
                <strong>{t('verification.waitingTitle')}</strong>
                <div style={{marginTop:4}}>{t('verification.waitingBody')}</div>
              </div>
            ) : (
              <>
                <div style={c.field}>
                  <label style={c.label}>{t('verification.amountToPayLabel')}</label>
                  <input style={{...c.input,borderColor:payStatus==='error'?'#A32D2D':'var(--border)'}}
                    type="number" min="1" max={remaining} placeholder={t('verification.maxPlaceholder', { amount: remaining.toLocaleString('fr-FR') + ' €' })}
                    value={payAmt} onChange={e=>{setPayAmt(e.target.value);setPayStatus('idle');setPayMsg('');}}/>
                  {payStatus === 'error' && <div style={{fontSize:11,color:'#A32D2D'}}>{payMsg}</div>}
                </div>
                <button
                  style={{...c.submitBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:paying?0.6:1}}
                  onClick={handlePayment} disabled={paying}>
                  {paying ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/>{t('common.sending')}</>
                    : <><i className="ti ti-send"/>{t('verification.submitPayment')}</>}
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
              <div style={{fontSize:14,fontWeight:600,color:'var(--navy)',marginBottom:6}}>{t('verification.paymentCompleteTitle')}</div>
              <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.7}}>
                {t('verification.paymentCompleteBody', { fee: `${totalFee.toLocaleString('fr-FR')} €` })}
              </div>
            </div>
            <div style={{background:'#FAEEDA',borderRadius:8,padding:'10px 14px',display:'flex',gap:8,alignItems:'flex-start'}}>
              <i className="ti ti-calendar-stats" style={{color:'#854F0B',flexShrink:0,marginTop:1}}/>
              <div style={{fontSize:12,color:'#854F0B'}}>
                <strong>{t('verification.monthlyReminderLabel')}</strong>{' '}
                <Trans i18nKey="verification.monthlyReminderDoneStep"
                  values={{ alimFee: `${alimFee.toLocaleString('fr-FR')} €` }}
                  components={{ b: <strong/> }}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refus */}
      {step === 'rejected' && (
        <div style={{background:'#FCEBEB',borderRadius:12,padding:20,marginBottom:14,textAlign:'center'}}>
          <i className="ti ti-circle-x" style={{fontSize:36,color:'#A32D2D',display:'block',marginBottom:8}}/>
          <div style={{fontSize:13,fontWeight:600,color:'#A32D2D',marginBottom:4}}>{t('verification.rejectedTitle')}</div>
          {vf?.admin_note && <div style={{fontSize:12,color:'#A32D2D'}}>{t('verification.reasonLabel')} {vf.admin_note}</div>}
        </div>
      )}

      {/* Info contrat signé */}
      {vf?.contract_signed === 1 && (
        <div style={{...c.card}}>
          <div style={c.cardBd}>
            <div style={{fontSize:11,color:'var(--text2)',display:'flex',gap:8}}>
              <i className="ti ti-signature" style={{color:'var(--gold)',flexShrink:0}}/>
              <Trans i18nKey="verification.contractSignedInfo"
                values={{ name: vf.contract_signature, date: new Date(vf.contract_signed_at).toLocaleDateString(dLocale(),{day:'2-digit',month:'long',year:'numeric'}) }}
                components={{ b: <strong/> }}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientDashboard() {
  const { t } = useTranslation();
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

  const navItems = getNavItems(t);

  // Mettre à jour le badge notifications dans la nav
  const navItemsWithBadge = navItems.map(item =>
    item.id === 'notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item.id === 'notifications'
      ? { ...item, badge: undefined }
      : item
  );

  const pageMeta = getPageMeta(t);
  const getMeta = (p) => {
    if (p === 'accueil') return pageMeta.accueil(currentUser);
    if (p === 'notifications') return [t('nav.notifications'), unreadCount > 0 ? `${unreadCount} ${unreadCount > 1 ? t('dashboard.unreadNotifPlural') : t('dashboard.unreadNotif')}` : t('dashboard.noNewNotif')];
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
    <DashboardLayout title={title} subtitle={subtitle} navItems={navItemsWithBadge} activePage={page} onPageChange={setPage} logoSub={t('client.clientSpaceLogo')} userLabel={userLabel} userRole={userRole} extraSidebarContent={<SidebarExtra user={currentUser}/>}>
      {pages[page]}
    </DashboardLayout>
  );
}
