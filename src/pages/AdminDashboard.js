import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/api';

// `c` reste utilisé tel quel par les pages pas encore converties ; les deux
// coexistent le temps de la migration progressive (retiré une fois toutes
// les pages migrées, comme pour ClientDashboard.js).
const c = {
  card: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)' },
  cardHd: { padding:'13px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'center' },
  cardTitle: { fontSize:13, fontWeight:500, color:'var(--text)' },
  cardLink: { fontSize:11, color:'#185FA5', cursor:'pointer' },
  cardBd: { padding:'12px 16px' },
  kpi: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' },
  badge: { fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500, display:'inline-block' },
  field: { display:'flex', flexDirection:'column', gap:5, marginBottom:14 },
  label: { fontSize:11, color:'var(--text2)' },
  input: { height:38, border:'1px solid var(--border)', borderRadius:8, padding:'0 12px', fontSize:13, fontFamily:'var(--sans)', color:'var(--text)', background:'var(--bg)', outline:'none' },
  saveBtn: { height:38, background:'var(--navy)', border:'none', borderRadius:8, padding:'0 20px', fontSize:12, color:'#fff', cursor:'pointer', fontFamily:'var(--sans)' },
  skeleton: { background:'linear-gradient(90deg,var(--bg) 25%,var(--border) 50%,var(--bg) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', borderRadius:6 },
};

// Classes Tailwind partagées par toutes les pages du dashboard admin.
const tw = {
  card: 'rounded-xl border border-navy/10 bg-white',
  cardHd: 'flex items-center justify-between px-4 pt-[13px]',
  cardTitle: 'text-[13px] font-medium text-navy',
  cardLink: 'cursor-pointer text-[11px] text-[#185FA5]',
  cardBd: 'px-4 py-3',
  kpi: 'rounded-xl border border-navy/10 bg-white px-4 py-3.5',
  badge: 'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
  field: 'flex flex-col gap-[5px] mb-3.5',
  label: 'text-[11px] text-[#64748B]',
  input: 'h-[38px] rounded-lg border border-navy/10 bg-[#F8F6F1] px-3 text-[13px] font-sans text-navy outline-none',
  saveBtn: 'h-[38px] rounded-lg border-none bg-navy px-5 font-sans text-xs text-white cursor-pointer',
  skeleton: 'rounded-md bg-gradient-to-r from-[#F8F6F1] via-navy/10 to-[#F8F6F1] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]',
};

const navItems = [
  { section:'Principal' },
  { id:'dashboard', icon:'ti-layout-dashboard', label:'Tableau de bord' },
  { id:'clients', icon:'ti-users', label:'Clients' },
  { id:'messages', icon:'ti-message-2', label:'Messages' },
  { id:'comptes', icon:'ti-credit-card', label:'Comptes' },
  { id:'transactions', icon:'ti-arrows-exchange', label:'Transactions' },
  { id:'virement', icon:'ti-send', label:'Virement' },
  { section:'Analyse' },
  { id:'retraits', icon:'ti-arrow-up-circle', label:'Retraits' },
  { id:'fonds', icon:'ti-lock', label:'Fonds bloqués' },
  { id:'documents', icon:'ti-folder-open', label:'Documents' },
  { id:'rapports', icon:'ti-chart-bar', label:'Rapports' },
  { section:'Système' },
  { id:'parametres', icon:'ti-settings', label:'Paramètres' },
];

const typeStyle = {
  depot:    { bg:'#E6F1FB', color:'#185FA5', label:'Dépôt' },
  virement: { bg:'#FAEEDA', color:'#854F0B', label:'Virement' },
  retrait:  { bg:'#FCEBEB', color:'#A32D2D', label:'Retrait' },
};
const statusStyle = {
  active:   { bg:'#EAF3DE', color:'#3B6D11', label:'Actif' },
  pending:  { bg:'#FAEEDA', color:'#854F0B', label:'En attente' },
  inactive: { bg:'#F1EFE8', color:'#5F5E5A', label:'Inactif' },
  rejected: { bg:'#FCEBEB', color:'#A32D2D', label:'Refusé' },
  deleted:  { bg:'#F1EFE8', color:'#A32D2D', label:'Supprimé' },
  valide:   { bg:'#EAF3DE', color:'#3B6D11', label:'Validé' },
};

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
const initials = (fn, ln) => `${fn?.[0]||''}${ln?.[0]||''}`.toUpperCase();
const avatarColor = (i) => {
  const colors = [['#E6F1FB','#185FA5'],['#FBEAF0','#993556'],['#EAF3DE','#3B6D11'],['#FAEEDA','#854F0B'],['#F1EFE8','#5F5E5A']];
  return colors[i % colors.length];
};

function Skeleton({ h=14, mb=8 }) {
  return <div className={tw.skeleton} style={{ height:h, marginBottom:mb }}/>;
}

function EmptyState({ icon, message }) {
  return (
    <div className="py-7 px-4 text-center text-[#64748B]">
      <i className={`ti ${icon} mb-2 block text-[32px] opacity-30`}/>
      <div className="text-xs">{message}</div>
    </div>
  );
}

// ─── PAGE DASHBOARD ───────────────────────────────────────────────
function PageDashboard({ setPage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = data ? [
    { label:'Total géré', value:`${fmt(data.kpis.total_balance)} €`, delta:`${data.kpis.active_clients} clients actifs`, up:true, bg:'#FDF6E3', col:'#854F0B', ic:'ti-coin' },
    { label:'Clients', value:data.kpis.total_clients, delta:`+${data.kpis.new_clients_month} ce mois`, up:true, bg:'#E6F1FB', col:'#185FA5', ic:'ti-users' },
    { label:'Transactions', value:data.kpis.total_transactions, delta:`${data.month_stats.count} ce mois`, up:true, bg:'#EAF3DE', col:'#3B6D11', ic:'ti-arrows-exchange' },
    { label:'En attente', value:data.kpis.pending_clients, delta:'À valider', up: data.kpis.pending_clients === 0, bg:'#FCEBEB', col:'#A32D2D', ic:'ti-alert-triangle' },
  ] : [];

  return (
    <div className="animate-[fadeIn_0.35s_ease]">
      <div className="mb-[18px] grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? [1,2,3,4].map(i => (
          <div key={i} className={tw.kpi}><Skeleton h={11} mb={10}/><Skeleton h={22} mb={6}/><Skeleton h={11} mb={0}/></div>
        )) : kpis.map(k => (
          <div key={k.label} className={tw.kpi}>
            <div className="mb-2 flex items-start justify-between">
              <div className="text-[11px] text-[#64748B]">{k.label}</div>
              <div className="flex h-[27px] w-[27px] items-center justify-center rounded-[7px] text-sm" style={{ background:k.bg, color:k.col }}><i className={`ti ${k.ic}`}/></div>
            </div>
            <div className="text-xl font-medium leading-none text-navy">{k.value}</div>
            <div className={`mt-1.5 text-[11px] ${k.up ? 'text-[#3B6D11]' : 'text-[#A32D2D]'}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className={tw.card}>
          <div className={tw.cardHd}>
            <span className={tw.cardTitle}>Dernières transactions</span>
            <span className={tw.cardLink} onClick={() => setPage('transactions')}>Voir tout →</span>
          </div>
          <div className={tw.cardBd}>
            {loading ? [1,2,3,4].map(i => <Skeleton key={i} h={40} mb={10}/>) :
             !data?.recent_transactions?.length ? <EmptyState icon="ti-arrows-exchange" message="Aucune transaction"/> :
             data.recent_transactions.map((t, i) => {
               const ts = typeStyle[t.type] || typeStyle.depot;
               const isLast = i === data.recent_transactions.length - 1;
               return (
                 <div key={t.id} className={`flex items-center gap-2.5 py-2 ${isLast ? 'border-b-0' : 'border-b border-navy/10'}`}>
                   <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm" style={{ background:ts.bg, color:ts.color }}>
                     <i className={`ti ${t.type==='depot'?'ti-arrow-down-left':t.type==='retrait'?'ti-arrow-up-right':'ti-arrows-exchange'}`}/>
                   </div>
                   <div className="min-w-0 flex-1">
                     <div className="truncate text-xs font-medium">
                       {t.description || ts.label} — {t.first_name} {t.last_name}
                     </div>
                     <div className="text-[10px] text-[#64748B]">{fmtDate(t.created_at)}</div>
                   </div>
                   <div className={`shrink-0 text-xs font-medium ${t.type==='retrait'?'text-[#A32D2D]':'text-[#3B6D11]'}`}>
                     {t.type==='retrait'?'-':'+'}{fmt(t.amount)} €
                   </div>
                 </div>
               );
             })}
          </div>
        </div>

        <div className={tw.card}>
          <div className={tw.cardHd}><span className={tw.cardTitle}>Activité du mois</span></div>
          <div className={tw.cardBd}>
            {loading ? [1,2,3,4].map(i => <Skeleton key={i} h={28} mb={10}/>) : (
              <>
                {[
                  ['Dépôts', data?.month_stats.total_depot, '#3B6D11'],
                  ['Retraits', data?.month_stats.total_retrait, '#A32D2D'],
                  ['Virements', data?.month_stats.total_virement, '#185FA5'],
                ].map(([label, val, col]) => (
                  <div key={label} className="flex justify-between border-b border-navy/10 py-2 text-xs">
                    <span className="text-[#64748B]">{label}</span>
                    <span className="font-medium" style={{ color:col }}>{fmt(val)} €</span>
                  </div>
                ))}
                <div className="mt-3 border-t border-navy/10 pt-2.5">
                  <div className="mb-1 text-[11px] text-[#64748B]">Volume total géré</div>
                  <div className="font-serif text-xl text-navy">{fmt(data?.kpis.total_balance)} €</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE CLIENTS ─────────────────────────────────────────────────
function PageClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [ibanForm, setIbanForm] = useState({ client_iban:'', client_bic:'' });
  const [ibanStatus, setIbanStatus] = useState('idle');
  const [ibanMsg, setIbanMsg] = useState('');
  const [notifForm, setNotifForm] = useState({ title:'', message:'' });
  const [notifSendEmail, setNotifSendEmail] = useState(false);
  const [notifStatus, setNotifStatus] = useState('idle');
  const [notifMsg, setNotifMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getClients(search, statusFilter);
      setClients(res.data.clients);
    } catch(e) { setClients([]); }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const CATEGORIES = [
    { value:'basic_moins',  label:'Basic Moins',  bg:'#fce8e8', col:'#A32D2D' },
    { value:'basic',        label:'Basic',        bg:'#f0f0f0', col:'#555' },
    { value:'basic_plus',   label:'Basic Plus',   bg:'#e8f4fd', col:'#185FA5' },
    { value:'premium',      label:'Premium',      bg:'#FAEEDA', col:'#854F0B' },
    { value:'premium_plus', label:'Premium Plus', bg:'#f5e6fa', col:'#7a1fa8' },
    { value:'vip',          label:'VIP',          bg:'#EAF3DE', col:'#3B6D11' },
    { value:'vip_plus',     label:'VIP Plus',     bg:'#0a1628', col:'#c9a84c' },
  ];
  const catStyle = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[0];

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(true);
    try {
      await adminService.updateClientStatus(id, newStatus);
      setClients(prev => prev.map(cl => cl.id === id ? { ...cl, status: newStatus } : cl));
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus }));
    } catch(e) {}
    setUpdating(false);
  };

  const [deleteMsg, setDeleteMsg] = useState('');

  const handleDeleteClient = async (id, name) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${name} ?\n\nLe client ne pourra plus se connecter. Cette action est irréversible.`)) return;
    setUpdating(true); setDeleteMsg('');
    try {
      const res = await adminService.deleteClient(id);
      if (res.success) {
        setClients(prev => prev.filter(cl => cl.id !== id));
        if (selected?.id === id) setSelected(null);
      } else {
        setDeleteMsg(res.message || 'Erreur lors de la suppression.');
      }
    } catch (e) {
      setDeleteMsg(e?.message || 'Erreur serveur.');
    }
    setUpdating(false);
  };

  const handleAssignIbanBic = async () => {
    if (!selected) return;
    if (!ibanForm.client_iban.trim() || !ibanForm.client_bic.trim()) {
      setIbanMsg('IBAN et BIC requis.'); setIbanStatus('error'); return;
    }
    setIbanStatus('loading'); setIbanMsg('');
    try {
      const res = await adminService.assignIbanBic(selected.id, ibanForm.client_iban, ibanForm.client_bic);
      if (res.success) {
        setIbanStatus('success'); setIbanMsg('IBAN et BIC attribués.');
        setClients(prev => prev.map(cl => cl.id === selected.id ? { ...cl, client_iban: ibanForm.client_iban.replace(/\s/g,'').toUpperCase(), client_bic: ibanForm.client_bic.trim().toUpperCase() } : cl));
        setSelected(prev => ({ ...prev, client_iban: ibanForm.client_iban.replace(/\s/g,'').toUpperCase(), client_bic: ibanForm.client_bic.trim().toUpperCase() }));
      } else { setIbanStatus('error'); setIbanMsg(res.message || 'Erreur.'); }
    } catch { setIbanStatus('error'); setIbanMsg('Erreur serveur.'); }
  };

  const handleCategoryChange = async (id, newCat) => {
    setUpdating(true);
    try {
      await adminService.updateCategory(id, newCat);
      setClients(prev => prev.map(cl => cl.id === id ? { ...cl, account_category: newCat } : cl));
      if (selected?.id === id) setSelected(prev => ({ ...prev, account_category: newCat }));
    } catch(e) {}
    setUpdating(false);
  };

  const handleSendNotification = async () => {
    if (!selected) return;
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      setNotifMsg('Titre et message requis.'); setNotifStatus('error'); return;
    }
    setNotifStatus('loading'); setNotifMsg('');
    try {
      const res = await adminService.sendNotification(selected.id, notifForm.title.trim(), notifForm.message.trim(), notifSendEmail);
      if (res.success) {
        setNotifStatus('success'); setNotifMsg(res.message || 'Notification envoyée.');
        setNotifForm({ title:'', message:'' });
        setNotifSendEmail(false);
      } else { setNotifStatus('error'); setNotifMsg(res.message || 'Erreur.'); }
    } catch { setNotifStatus('error'); setNotifMsg('Erreur serveur.'); }
  };

  return (
    <div className="animate-[fadeIn_0.35s_ease]">
      <div className="mb-3.5 flex flex-wrap gap-2">
        <div className="relative min-w-[180px] flex-1">
          <i className="ti ti-search pointer-events-none absolute left-[9px] top-1/2 -translate-y-1/2 text-sm text-[#64748B]"/>
          <input value={search} onChange={e => setSearch(e.target.value)} className="h-[34px] w-full rounded-lg border border-navy/10 bg-white pl-[30px] pr-2.5 font-sans text-xs text-navy outline-none" placeholder="Rechercher un client..."/>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-[34px] cursor-pointer rounded-lg border border-navy/10 bg-white px-3 font-sans text-xs text-navy outline-none">
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="pending">En attente</option>
          <option value="inactive">Inactifs</option>
          <option value="rejected">Refusés</option>
          <option value="deleted">Supprimés</option>
        </select>
      </div>

      <div className={`${tw.card} overflow-x-auto`}>
        {loading ? (
          <div className="p-4">{[1,2,3,4].map(i => <Skeleton key={i} h={42} mb={8}/>)}</div>
        ) : clients.length === 0 ? (
          <EmptyState icon="ti-users" message="Aucun client trouvé"/>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>{['Client','Numéro','Catégorie','Solde','Statut','Actions'].map(h => (
                <th key={h} className="whitespace-nowrap border-b border-navy/10 px-3 py-[7px] text-left text-[10px] font-medium uppercase tracking-wide text-[#64748B]">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {clients.map((cl, i) => {
                const ss = statusStyle[cl.status] || statusStyle.pending;
                const [bg, col] = avatarColor(i);
                return (
                  <tr key={cl.id} className="hover:bg-[#F8F6F1]">
                    <td className="whitespace-nowrap px-3 py-[9px]">
                      <span className="mr-2 inline-flex h-[26px] w-[26px] items-center justify-center rounded-full align-middle text-[10px] font-semibold" style={{ background:bg, color:col }}>{initials(cl.first_name, cl.last_name)}</span>
                      {cl.first_name} {cl.last_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px] font-mono text-[11px] text-[#64748B]">{cl.account_number}</td>
                    <td className="px-3 py-[9px]">
                      <select value={cl.account_category || 'basic'} onChange={e => handleCategoryChange(cl.id, e.target.value)} disabled={updating}
                        className="cursor-pointer rounded-xl border border-navy/10 px-2 py-0.5 font-sans text-[10px] font-semibold"
                        style={{ background: catStyle(cl.account_category).bg, color: catStyle(cl.account_category).col }}>
                        {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px] font-medium">{fmt(cl.balance)} €</td>
                    <td className="px-3 py-[9px]">
                      <select value={cl.status} onChange={e => handleStatusChange(cl.id, e.target.value)} disabled={updating}
                        className={`${tw.badge} cursor-pointer border-none font-sans`}
                        style={{ background:ss.bg, color:ss.color }}>
                        <option value="active">Actif</option>
                        <option value="pending">En attente</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </td>
                    <td className="px-3 py-[9px]">
                      <button onClick={() => { setSelected(cl); setIbanForm({ client_iban: cl.client_iban || '', client_bic: cl.client_bic || '' }); setIbanStatus('idle'); setIbanMsg(''); setNotifForm({ title:'', message:'' }); setNotifStatus('idle'); setNotifMsg(''); }} className="cursor-pointer rounded-md border border-navy/10 bg-transparent px-2.5 py-[3px] font-sans text-[11px]">Voir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal détail client */}
      {selected && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="relative max-h-[80vh] w-full max-w-[420px] overflow-y-auto rounded-2xl bg-white p-6">
            <button onClick={() => setSelected(null)} className="absolute right-3 top-3 cursor-pointer border-none bg-transparent text-lg text-[#64748B]">✕</button>
            <div className="mb-[18px] flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy font-serif text-lg text-gold">{initials(selected.first_name, selected.last_name)}</div>
              <div>
                <div className="font-serif text-lg text-navy">{selected.first_name} {selected.last_name}</div>
                <div className="font-mono text-[11px] text-[#64748B]">{selected.account_number}</div>
              </div>
            </div>
            {[['Email', selected.email],['Téléphone', selected.phone||'—'],['Adresse', selected.address||'—'],['Ville', selected.city||'—'],['Code postal', selected.postal_code||'—'],['Type', selected.account_type],['Solde', `${fmt(selected.balance)} €`],['Inscrit le', fmtDate(selected.created_at)]].map(([k,v]) => (
              <div key={k} className="flex justify-between border-b border-navy/10 py-[7px] text-xs">
                <span className="text-[#64748B]">{k}</span>
                <span className={k==='Solde' ? 'font-medium' : ''}>{v}</span>
              </div>
            ))}
            {/* IBAN / BIC */}
            <div className="mb-3.5 mt-3.5 rounded-[10px] bg-[#F8F6F1] p-3.5">
              <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-navy">
                <i className="ti ti-building-bank text-gold"/>
                IBAN &amp; BIC du client
              </div>
              {selected.client_iban ? (
                <div className="mb-2.5">
                  <div className="mb-[3px] text-[11px] text-[#64748B]">IBAN actuel</div>
                  <div className="font-mono text-xs font-semibold tracking-wide text-navy">
                    {selected.client_iban.replace(/(.{4})/g, '$1 ').trim()}
                  </div>
                  <div className="mt-1 text-[11px] text-[#64748B]">BIC : <strong>{selected.client_bic}</strong></div>
                </div>
              ) : (
                <div className="mb-2 text-[11px] text-[#A32D2D]">⚠ Aucun IBAN attribué</div>
              )}
              <div className="mb-1.5 flex gap-1.5">
                <div className="flex-[2]">
                  <div className="mb-0.5 text-[10px] text-[#64748B]">IBAN</div>
                  <input className={`${tw.input} font-mono text-[11px]`}
                    placeholder="FR76 3000 6000 0112 3456 7890 189"
                    value={ibanForm.client_iban}
                    onChange={e => { setIbanForm(f => ({ ...f, client_iban: e.target.value })); setIbanStatus('idle'); setIbanMsg(''); }}/>
                </div>
                <div className="flex-1">
                  <div className="mb-0.5 text-[10px] text-[#64748B]">BIC</div>
                  <input className={`${tw.input} font-mono text-[11px]`}
                    placeholder="BNPAFRPP"
                    value={ibanForm.client_bic}
                    onChange={e => { setIbanForm(f => ({ ...f, client_bic: e.target.value })); setIbanStatus('idle'); setIbanMsg(''); }}/>
                </div>
              </div>
              {ibanMsg && (
                <div className={`mb-1.5 rounded-md px-2.5 py-1.5 text-[11px] ${ibanStatus==='success' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FCEBEB] text-[#A32D2D]'}`}>
                  {ibanMsg}
                </div>
              )}
              <button onClick={handleAssignIbanBic} disabled={ibanStatus==='loading'}
                className={`h-[34px] w-full rounded-lg border-none bg-navy font-sans text-xs font-semibold text-white cursor-pointer ${ibanStatus==='loading' ? 'opacity-60' : 'opacity-100'}`}>
                {ibanStatus==='loading' ? 'Attribution…' : selected.client_iban ? 'Modifier IBAN / BIC' : 'Attribuer IBAN / BIC'}
              </button>
            </div>

            {/* Catégorie de compte */}
            <div className="mb-3.5 mt-3.5">
              <div className="mb-1.5 text-[11px] text-[#64748B]">Catégorie de compte</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button key={cat.value}
                    onClick={() => handleCategoryChange(selected.id, cat.value)}
                    disabled={updating || selected.account_category === cat.value}
                    className={`rounded-xl border px-3 py-1 font-sans text-[11px] ${selected.account_category===cat.value ? 'cursor-default font-bold' : 'cursor-pointer font-normal'}`}
                    style={{ borderColor: cat.bg,
                      background: selected.account_category===cat.value ? cat.bg : 'transparent',
                      color: selected.account_category===cat.value ? cat.col : 'var(--text2)' }}>
                    {selected.account_category===cat.value ? '✓ ' : ''}{cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Envoyer une notification */}
            <div className="mb-3.5 mt-3.5 rounded-[10px] bg-[#F8F6F1] p-3.5">
              <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-navy">
                <i className="ti ti-bell text-gold"/>
                Envoyer une notification à {selected.first_name}
              </div>
              <div className="mb-1.5">
                <div className="mb-0.5 text-[10px] text-[#64748B]">Titre</div>
                <input className={`${tw.input} text-xs`}
                  placeholder="Ex : Information importante"
                  value={notifForm.title}
                  onChange={e => { setNotifForm(f => ({ ...f, title: e.target.value })); setNotifStatus('idle'); setNotifMsg(''); }}/>
              </div>
              <div className="mb-1.5">
                <div className="mb-0.5 text-[10px] text-[#64748B]">Message</div>
                <textarea className="h-[70px] w-full resize-y rounded-lg border border-navy/10 bg-[#F8F6F1] px-3 pt-2 font-sans text-xs text-navy outline-none"
                  placeholder="Écrivez votre message au client..."
                  value={notifForm.message}
                  onChange={e => { setNotifForm(f => ({ ...f, message: e.target.value })); setNotifStatus('idle'); setNotifMsg(''); }}/>
              </div>
              {notifMsg && (
                <div className={`mb-1.5 rounded-md px-2.5 py-1.5 text-[11px] ${notifStatus==='success' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FCEBEB] text-[#A32D2D]'}`}>
                  {notifMsg}
                </div>
              )}
              <label className="mb-2.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-[#64748B]">
                <input type="checkbox" checked={notifSendEmail}
                  onChange={e => setNotifSendEmail(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer"/>
                Envoyer aussi un email à {selected.first_name} au nom d'OJADA BANK
              </label>
              <button onClick={handleSendNotification} disabled={notifStatus==='loading'}
                className={`h-[34px] w-full rounded-lg border-none bg-navy font-sans text-xs font-semibold text-white cursor-pointer ${notifStatus==='loading' ? 'opacity-60' : 'opacity-100'}`}>
                {notifStatus==='loading' ? 'Envoi…' : (notifSendEmail ? '📧 Envoyer la notification + l\'email' : '📨 Envoyer la notification')}
              </button>
            </div>

            <div className="mt-3.5 flex gap-2">
              {['active','pending','inactive'].map(st => {
                const ss = statusStyle[st];
                const isCurrent = selected.status===st;
                return (
                  <button key={st} onClick={() => handleStatusChange(selected.id, st)} disabled={updating || isCurrent}
                    className={`h-[34px] flex-1 rounded-[7px] border font-sans text-[11px] transition-all duration-150 ${isCurrent ? 'cursor-default' : 'cursor-pointer'}`}
                    style={{ borderColor: ss.bg, background: isCurrent ? ss.bg : 'transparent', color: isCurrent ? ss.color : 'var(--text2)' }}>
                    {ss.label}
                  </button>
                );
              })}
            </div>

            {/* Actions sensibles */}
            <div className="mt-2.5 flex gap-2">
              {selected.status === 'pending' && (
                <button onClick={() => handleStatusChange(selected.id, 'rejected')} disabled={updating}
                  className="h-[34px] flex-1 cursor-pointer rounded-[7px] border border-[#FCEBEB] bg-transparent font-sans text-[11px] text-[#A32D2D]">
                  🚫 Refuser l'inscription
                </button>
              )}
              {selected.status !== 'deleted' && (
                <button onClick={() => handleDeleteClient(selected.id, `${selected.first_name} ${selected.last_name}`)} disabled={updating}
                  className="h-[34px] flex-1 cursor-pointer rounded-[7px] border border-[#A32D2D] bg-[#A32D2D] font-sans text-[11px] font-semibold text-white">
                  🗑️ Supprimer le compte
                </button>
              )}
            </div>
            {deleteMsg && (
              <div className="mt-2 rounded-md bg-[#FCEBEB] px-2.5 py-1.5 text-[11px] text-[#A32D2D]">
                {deleteMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE MESSAGES (boîte de réception client → admin) ────────────
function PageMessages() {
  const [threads, setThreads]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeId, setActiveId]   = useState(null);
  const [thread, setThread]       = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending]     = useState(false);
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadThreads = async () => {
    setLoading(true);
    try { const r = await adminService.getClientMessages(); setThreads(r.data || []); } catch { setThreads([]); }
    setLoading(false);
  };

  useEffect(() => { loadThreads(); }, []);

  const openThread = async (threadId) => {
    setActiveId(threadId);
    setLoadingThread(true);
    setThread(null);
    try { const r = await adminService.getMessageThread(threadId); setThread(r.data || null); } catch { setThread(null); }
    setLoadingThread(false);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !activeId) return;
    setSending(true);
    try {
      const r = await adminService.replyToClientMessage(activeId, replyText.trim());
      if (r.success) {
        setReplyText('');
        await openThread(activeId);
        await loadThreads();
        showToast('✅ Réponse envoyée.');
      } else showToast('Erreur : ' + r.message);
    } catch { showToast('Erreur serveur.'); }
    setSending(false);
  };

  return (
    <div>
      <div className="mb-4">
        <div className="text-lg font-semibold text-navy">Messages</div>
        <div className="text-xs text-[#64748B]">Messages envoyés par les clients</div>
      </div>

      {toast && (
        <div className="fixed right-5 top-5 z-[999] rounded-lg bg-navy px-[18px] py-2.5 text-xs text-white">
          {toast}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Liste des fils */}
        <div className={`${tw.card} max-h-[640px] w-[340px] shrink-0 overflow-y-auto`}>
          <div className={tw.cardHd}><span className={tw.cardTitle}>Conversations ({threads.length})</span></div>
          <div className="py-2">
            {loading ? (
              <div className="p-4"><Skeleton mb={10}/><Skeleton mb={10}/><Skeleton/></div>
            ) : threads.length === 0 ? (
              <EmptyState icon="ti-message-off" message="Aucun message reçu."/>
            ) : threads.map(t => {
              const unanswered = Number(t.admin_reply_count) === 0;
              return (
                <div key={t.thread_id} onClick={() => openThread(t.thread_id)}
                  className={`cursor-pointer border-b border-navy/10 px-4 py-2.5 ${activeId === t.thread_id ? 'bg-[#F8F6F1]' : 'bg-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-navy">{t.first_name} {t.last_name}</span>
                    {unanswered && <span className={`${tw.badge} bg-[#FCEBEB] text-[#A32D2D]`}>Sans réponse</span>}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[#64748B]">
                    {t.last_sender_role === 'admin' ? 'Vous : ' : ''}{t.last_body}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#64748B]">{new Date(t.last_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Détail du fil */}
        <div className={`${tw.card} min-h-[400px] flex-1`}>
          {!activeId ? (
            <div className="p-10"><EmptyState icon="ti-message-2" message="Sélectionnez une conversation."/></div>
          ) : loadingThread ? (
            <div className="p-4"><Skeleton mb={10}/><Skeleton mb={10}/><Skeleton/></div>
          ) : !thread ? (
            <div className="p-10"><EmptyState icon="ti-alert-triangle" message="Impossible de charger ce fil."/></div>
          ) : (
            <>
              <div className={`${tw.cardHd} border-b border-navy/10 pb-3`}>
                <span className={tw.cardTitle}>{thread.client?.first_name} {thread.client?.last_name} — {thread.client?.account_number}</span>
              </div>
              <div className="flex max-h-[440px] flex-col gap-2.5 overflow-y-auto p-4">
                {thread.messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-[10px] px-3 py-2 ${m.sender_role === 'admin' ? 'bg-navy text-white' : 'bg-[#F8F6F1] text-navy'}`}>
                      {m.title && <div className="mb-0.5 text-[11px] font-semibold opacity-85">{m.title}</div>}
                      <div className="text-xs leading-[1.5]">{m.body}</div>
                      <div className="mt-1 text-[9px] opacity-70">{new Date(m.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-navy/10 p-4">
                <input className={`${tw.input} flex-1`} placeholder="Écrire une réponse..." value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !sending) handleReply(); }}/>
                <button onClick={handleReply} disabled={sending || !replyText.trim()}
                  className={`${tw.saveBtn} ${sending || !replyText.trim() ? 'opacity-60' : 'opacity-100'}`}>
                  {sending ? '...' : 'Envoyer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE COMPTES ─────────────────────────────────────────────────
function PageComptes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getClients().then(r => { setClients(r.data.clients); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-[fadeIn_0.35s_ease]">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4].map(i => <div key={i} className={`${tw.card} p-4`}><Skeleton h={100} mb={0}/></div>)}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState icon="ti-credit-card" message="Aucun compte enregistré"/>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map(cl => {
            const ss = statusStyle[cl.status] || statusStyle.pending;
            return (
              <div key={cl.id} className={tw.card}>
                <div className={tw.cardBd}>
                  <div className="mb-[3px] flex items-start justify-between">
                    <div className="text-[10px] uppercase tracking-wide text-[#64748B]">{cl.account_type}</div>
                    <span className={tw.badge} style={{ background:ss.bg, color:ss.color }}>{ss.label}</span>
                  </div>
                  <div className="mb-2.5 font-mono text-[11px] tracking-wide text-[#64748B]">{cl.account_number}</div>
                  <div className="mb-1 font-serif text-2xl text-navy">{fmt(cl.balance)} <span className="text-sm text-[#64748B]">€</span></div>
                  <div className="text-[11px] text-[#64748B]"><i className="ti ti-user mr-1"/>{cl.first_name} {cl.last_name}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PAGE TRANSACTIONS ────────────────────────────────────────────
function PageTransactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getTransactions(filter === 'tous' ? '' : filter);
      setTxns(res.data.transactions);
    } catch(e) { setTxns([]); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-[fadeIn_0.35s_ease]">
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {['tous','depot','retrait','virement'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border border-navy/10 px-3.5 py-[5px] font-sans text-[11px] transition-colors duration-150 ${filter===f ? 'bg-navy text-white' : 'bg-transparent text-[#64748B]'}`}>
            {f==='tous'?'Toutes':f==='depot'?'Dépôts':f==='retrait'?'Retraits':'Virements'}
          </button>
        ))}
      </div>
      <div className={`${tw.card} overflow-x-auto`}>
        {loading ? (
          <div className="p-4">{[1,2,3,4].map(i => <Skeleton key={i} h={36} mb={8}/>)}</div>
        ) : txns.length === 0 ? <EmptyState icon="ti-receipt" message="Aucune transaction"/> : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>{['Référence','Client','Type','Montant','Date','Statut'].map(h => (
                <th key={h} className="whitespace-nowrap border-b border-navy/10 px-3 py-[7px] text-left text-[10px] font-medium uppercase tracking-wide text-[#64748B]">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {txns.map((t, i) => {
                const ts = typeStyle[t.type] || typeStyle.depot;
                const ss = statusStyle[t.status] || statusStyle.valide;
                return (
                  <tr key={t.id} className="hover:bg-[#F8F6F1]">
                    <td className="whitespace-nowrap px-3 py-[9px] font-mono text-[11px] text-[#64748B]">{t.reference}</td>
                    <td className="whitespace-nowrap px-3 py-[9px]">{t.first_name} {t.last_name}</td>
                    <td className="px-3 py-[9px]"><span className={tw.badge} style={{ background:ts.bg, color:ts.color }}>{ts.label}</span></td>
                    <td className={`whitespace-nowrap px-3 py-[9px] font-medium ${t.type==='retrait'?'text-[#A32D2D]':'text-[#3B6D11]'}`}>
                      {t.type==='retrait'?'-':'+'}{fmt(t.amount)} €
                    </td>
                    <td className="whitespace-nowrap px-3 py-[9px] text-[11px] text-[#64748B]">{fmtDate(t.created_at)}</td>
                    <td className="px-3 py-[9px]"><span className={tw.badge} style={{ background:ss.bg, color:ss.color }}>{ss.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── PAGE VIREMENT ADMIN ──────────────────────────────────────────
function PageVirement() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Recherche côté serveur (comme la page Clients), plutôt qu'un chargement unique sans terme de
    // recherche : sans ça, le backend ne renvoie que les 50 comptes les plus récents (LIMIT 50, non
    // recherché), donc un client plus ancien comme "Montrevault" n'apparaît jamais, même si le filtre
    // local sur le texte reçu fonctionne parfaitement — le client cherché n'est simplement jamais reçu.
    if (!search) { setClients([]); return; }
    adminService.getClients(search).then(r => setClients(r.data.clients)).catch(() => setClients([]));
  }, [search]);

  const filtered = clients; // déjà filtré côté serveur par le terme de recherche

  const selectedInfo = clients.find(cl => cl.id === parseInt(selectedClient));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient || !amount || Number(amount) <= 0) {
      setError('Veuillez sélectionner un client et saisir un montant valide.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(null);
    try {
      const res = await adminService.transferFunds(parseInt(selectedClient), Number(amount), note);
      setSuccess(res.message);
      setAmount('');
      setNote('');
      setSelectedClient('');
      setSearch('');
      setClients([]);
    } catch(err) {
      setError(err.message || 'Erreur lors du virement.');
    }
    setLoading(false);
  };

  return (
    <div style={{ animation:'fadeIn 0.35s ease', maxWidth:560 }}>
      {/* Bandeau solde admin */}
      <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy3))', borderRadius:14, padding:'18px 22px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:11, color:'rgba(201,168,76,0.6)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Solde Administration</div>
          <div style={{ fontFamily:'var(--serif)', fontSize:28, color:'#fff', fontWeight:600 }}>∞ <span style={{ fontSize:16, color:'rgba(255,255,255,0.4)' }}>Illimité</span></div>
        </div>
        <div style={{ width:44, height:44, borderRadius:12, background:'rgba(201,168,76,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'var(--gold)' }}>
          <i className="ti ti-infinity"/>
        </div>
      </div>

      {success && (
        <div style={{ background:'#EAF3DE', border:'1px solid #C0DD97', borderRadius:10, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#3B6D11', display:'flex', alignItems:'center', gap:8 }}>
          <i className="ti ti-circle-check" style={{ fontSize:18 }}/>{success}
        </div>
      )}
      {error && (
        <div style={{ background:'#FCEBEB', border:'1px solid #F7C1C1', borderRadius:10, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#A32D2D', display:'flex', alignItems:'center', gap:8 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize:16 }}/>{error}
        </div>
      )}

      <div style={{ ...c.card }}>
        <div style={c.cardHd}><span style={c.cardTitle}>Envoyer des fonds à un client</span></div>
        <div style={c.cardBd}>
          <form onSubmit={handleSubmit}>
            {/* Recherche client */}
            <div style={c.field}>
              <label style={c.label}>Rechercher un client</label>
              <div style={{ position:'relative' }}>
                <i className="ti ti-search" style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text2)', fontSize:14, pointerEvents:'none' }}/>
                <input value={search} onChange={e => { setSearch(e.target.value); setSelectedClient(''); }} style={{ ...c.input, paddingLeft:30, width:'100%' }} placeholder="Nom, prénom ou numéro de compte..."/>
              </div>
            </div>

            {/* Liste des clients filtrés */}
            {search && (
              <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', marginBottom:14, maxHeight:180, overflowY:'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding:'12px 14px', fontSize:12, color:'var(--text2)' }}>Aucun client trouvé</div>
                ) : filtered.map((cl, i) => {
                  const ss = statusStyle[cl.status] || statusStyle.pending;
                  return (
                    <div key={cl.id} onClick={() => { setSelectedClient(String(cl.id)); setSearch(`${cl.first_name} ${cl.last_name}`); }}
                      style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none', background: selectedClient===String(cl.id) ? 'var(--bg)' : 'transparent', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background= selectedClient===String(cl.id) ? 'var(--bg)' : 'transparent'}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--navy)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0, fontFamily:'var(--serif)' }}>
                        {`${cl.first_name?.[0]||''}${cl.last_name?.[0]||''}`.toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:500 }}>{cl.first_name} {cl.last_name}</div>
                        <div style={{ fontSize:10, color:'var(--text2)', fontFamily:'monospace' }}>{cl.account_number}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:12, fontWeight:500 }}>{Number(cl.balance).toLocaleString('fr-FR')} €</div>
                        <span style={{ ...c.badge, background:ss.bg, color:ss.color, fontSize:9 }}>{ss.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Aperçu client sélectionné */}
            {selectedInfo && !search.includes(' ') === false && (
              <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, border:'1px solid var(--border)' }}>
                <i className="ti ti-user-check" style={{ color:'#3B6D11', fontSize:16 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500 }}>{selectedInfo.first_name} {selectedInfo.last_name}</div>
                  <div style={{ fontSize:11, color:'var(--text2)' }}>Solde actuel : <strong>{Number(selectedInfo.balance).toLocaleString('fr-FR')} €</strong></div>
                </div>
              </div>
            )}

            {/* Montant */}
            <div style={c.field}>
              <label style={c.label}>Montant à envoyer (€)</label>
              <div style={{ position:'relative' }}>
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" step="0.01" style={{ ...c.input, width:'100%', fontSize:20, height:50, fontFamily:'var(--serif)', paddingRight:40 }} placeholder="0"/>
                <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--text2)' }}>€</span>
              </div>
              {/* Montants rapides */}
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                {[100, 500, 1000, 5000, 10000].map(v => (
                  <button key={v} type="button" onClick={() => setAmount(String(v))}
                    style={{ fontSize:11, padding:'4px 12px', borderRadius:20, border:'1px solid var(--border)', background: amount===String(v) ? 'var(--navy)' : 'transparent', color: amount===String(v) ? '#fff' : 'var(--text2)', cursor:'pointer', fontFamily:'var(--sans)', transition:'all 0.15s' }}>
                    {v.toLocaleString('fr-FR')} €
                  </button>
                ))}
              </div>
            </div>

            {/* Motif */}
            <div style={c.field}>
              <label style={c.label}>Motif (optionnel)</label>
              <input value={note} onChange={e => setNote(e.target.value)} style={{ ...c.input, width:'100%' }} placeholder="Ex: Bonus, remboursement, aide..."/>
            </div>

            {/* Récapitulatif */}
            {selectedClient && amount && Number(amount) > 0 && (
              <div style={{ background:'#F8F6F1', borderRadius:8, padding:'12px 14px', marginBottom:14, fontSize:12 }}>
                <div style={{ fontWeight:500, color:'var(--navy)', marginBottom:8 }}>Récapitulatif</div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'var(--text2)' }}>Destinataire</span>
                  <span>{selectedInfo ? `${selectedInfo.first_name} ${selectedInfo.last_name}` : '—'}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'var(--text2)' }}>Montant envoyé</span>
                  <span style={{ color:'#3B6D11', fontWeight:500 }}>+{Number(amount).toLocaleString('fr-FR')} €</span>
                </div>
                {selectedInfo && (
                  <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid var(--border)', marginTop:4 }}>
                    <span style={{ color:'var(--text2)' }}>Nouveau solde client</span>
                    <span style={{ fontWeight:500 }}>{(Number(selectedInfo.balance) + Number(amount)).toLocaleString('fr-FR')} €</span>
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={loading || !selectedClient || !amount}
              style={{ width:'100%', height:42, background: (!selectedClient || !amount) ? 'var(--border)' : 'var(--gold)', border:'none', borderRadius:8, fontSize:13, fontFamily:'var(--sans)', color: (!selectedClient || !amount) ? 'var(--text2)' : 'var(--navy)', cursor: (!selectedClient || !amount) ? 'not-allowed' : 'pointer', fontWeight:500, transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {loading ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }}/>Envoi en cours...</> : <><i className="ti ti-send"/>Envoyer les fonds</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE RAPPORTS ────────────────────────────────────────────────
function PageRapports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getStats().then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const maxVal = stats ? Math.max(...stats.monthly.map(m => m.depot + m.retrait), 1) : 1;

  return (
    <div style={{ animation:'fadeIn 0.35s ease' }}>
      <div style={c.card}>
        <div style={c.cardHd}><span style={c.cardTitle}>Activité des 6 derniers mois</span></div>
        <div style={c.cardBd}>
          {loading ? <Skeleton h={120} mb={0}/> : (
            <>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120, padding:'8px 0' }}>
                {stats.monthly.map((m) => (
                  <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:2, height:'100%', justifyContent:'flex-end' }}>
                      <div style={{ width:'100%', background:'#C0DD97', borderRadius:'3px 3px 0 0', height:`${(m.depot/(maxVal||1))*90}%`, minHeight: m.depot > 0 ? 4 : 0 }}/>
                      <div style={{ width:'100%', background:'#F5A3A3', borderRadius:'3px 3px 0 0', height:`${(m.retrait/(maxVal||1))*90}%`, minHeight: m.retrait > 0 ? 4 : 0 }}/>
                    </div>
                    <span style={{ fontSize:10, color:'var(--text2)' }}>{m.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--text2)', marginTop:8 }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, background:'#C0DD97', borderRadius:2, display:'inline-block' }}/> Dépôts</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, background:'#F5A3A3', borderRadius:2, display:'inline-block' }}/> Retraits</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PARAMÈTRES ──────────────────────────────────────────────
function PageRetraits() {
  const FEES_BY_CAT = {
    basic_moins:  [250, 380, 425, 610, 795, 1300],
    basic:        [410, 825, 1270, 2830, 4125, 5348],
    basic_plus:   [490, 1500, 3210, 2630, 4925, 5500],
    premium:      [520, 1800, 3270, 6830, 2125, 7348],
    premium_plus: [820, 2850, 4800, 6930, 8125, 9248],
    vip:          [930, 3800, 5200, 7616, 8800, 9500],
    vip_plus:     [1345, 4170, 6790, 9616, 10807, 13066],
  };
  const FEE_NAMES_A = ["Frais de vérification de carte","Frais de synchronisation de carte","Frais d'achat de licence d'envoi","Frais de virement externe","Frais d'activation du compte","Frais de vérification d'identité"];
  const getFeesByCat = (cat) => (FEES_BY_CAT[cat] || FEES_BY_CAT.basic).map((amount, i) => ({ level:i, name:FEE_NAMES_A[i], amount }));
  const FEE_LEVELS = getFeesByCat('basic');

  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');
  const [modal, setModal]             = useState(null); // { wr, action }
  const [adminNote, setAdminNote]     = useState('');
  const [processing, setProcessing]   = useState(false);
  const [toast, setToast]             = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getWithdrawals(filter === 'all' ? '' : filter);
      setWithdrawals(res.data || []);
    } catch { setWithdrawals([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleProcess = async () => {
    if (!modal) return;
    setProcessing(true);
    try {
      const res = await adminService.processWithdrawal(modal.wr.id, modal.action, adminNote);
      if (res.success) {
        setToast(res.message || 'Action effectuée');
        setModal(null); setAdminNote('');
        load();
        setTimeout(() => setToast(''), 3500);
      } else {
        setToast('Erreur : ' + (res.message || 'Inconnue'));
        setTimeout(() => setToast(''), 3500);
      }
    } catch { setToast('Erreur serveur'); setTimeout(() => setToast(''), 3000); }
    setProcessing(false);
  };

  // Déterminer le libellé du statut
  const getStatusInfo = (wr) => {
    const s = wr.status;
    if (s === 'approved')        return { label:'✅ Retrait approuvé',        bg:'#EAF3DE', col:'#3B6D11', badge:'green' };
    if (s === 'cancelled')       return { label:'🚫 Annulé par le client',    bg:'#f0f0f0', col:'#666',    badge:null    };
    if (s === 'rejected')        return { label:'❌ Refusé',                  bg:'#FCEBEB', col:'#A32D2D', badge:null    };
    if (s === 'awaiting_final')  return { label:'🔔 Validation finale',       bg:'#EAF3DE', col:'#3B6D11', badge:'green' };
    if (s.startsWith('pending_fee_')) {
      const l = parseInt(s.replace('pending_fee_',''));
      return { label:'⏳ Étape '+(l+1)+'/6 — en attente client', bg:'#FCEBEB', col:'#A32D2D', badge:'red' };
    }
    if (s.startsWith('awaiting_fee_')) {
      const l = parseInt(s.replace('awaiting_fee_',''));
      return { label:'🔔 Étape '+(l+1)+'/6 — à valider',         bg:'#EAF3DE', col:'#3B6D11', badge:'green' };
    }
    return { label: s, bg:'#f0f0f0', col:'#555', badge:null };
  };

  // Actions disponibles selon le statut
  const getActions = (wr) => {
    const s = wr.status;
    if (s === 'approved' || s === 'rejected' || s === 'cancelled') return [];
    if (s.startsWith('awaiting_fee_')) {
      // Si paiement par tranche (fee_partial_amount > 0)
      if (Number(wr.pending_partial_amount || wr.fee_partial_amount || 0) > 0) return ['validate_partial', 'payment_failed', 'force_advance', 'reject'];
      return ['validate_fee', 'payment_failed', 'force_advance', 'reject'];
    }
    if (s === 'awaiting_final') return ['approve_final', 'reject'];
    if (s.startsWith('pending_fee_')) return ['force_advance', 'reject']; // client n'a pas encore confirmé, mais l'admin peut forcer le passage
    return ['reject'];
  };

  const actionLabel = (action) => {
    if (action === 'validate_fee')     return { label:'✅ Valider le paiement',  bg:'#3B6D11' };
    if (action === 'validate_partial') return { label:'✅ Valider la tranche',   bg:'#3B6D11' };
    if (action === 'payment_failed')   return { label:'❌ Paiement échoué',      bg:'#854F0B' };
    if (action === 'approve_final')    return { label:'✅ Approuver le retrait', bg:'#3B6D11' };
    if (action === 'force_advance')    return { label:'⏩ Forcer le passage',    bg:'#185FA5' };
    if (action === 'reject')           return { label:'🚫 Refuser',              bg:'#A32D2D' };
    return { label: action, bg:'#555' };
  };

  const modalTitle = (action) => {
    if (action === 'validate_fee')     return 'Valider le paiement des frais';
    if (action === 'validate_partial') return 'Valider la tranche de paiement';
    if (action === 'payment_failed')   return 'Signaler un échec de paiement';
    if (action === 'approve_final')    return 'Approuver le retrait final';
    if (action === 'force_advance')    return 'Forcer le passage à l\'étape suivante';
    if (action === 'reject')           return 'Refuser la demande';
    return action;
  };

  const modalDesc = (modal) => {
    if (!modal) return '';
    const wr  = modal.wr;
    const wrFeeLevels = getFeesByCat(wr.account_category || 'basic');
    const l   = (wr.status.startsWith('awaiting_fee_') || wr.status.startsWith('pending_fee_'))
      ? parseInt(wr.status.replace('awaiting_fee_','').replace('pending_fee_',''))
      : null;
    const fee = l !== null ? wrFeeLevels[l] : null;
    const feePaid   = Number(wr.fee_paid || 0);
    const partialAmt = Number(wr.pending_partial_amount || wr.fee_partial_amount || 0);
    const remaining = fee ? fee.amount - feePaid : 0;

    if (modal.action === 'validate_fee') {
      return 'Confirmer que ' + wr.user_first_name + ' ' + wr.user_last_name + ' a bien payé ' + (fee ? fee.amount.toLocaleString('fr-FR') : '?') + ' € pour "' + (fee ? fee.name : '') + '". Le client passera au niveau suivant.';
    }
    if (modal.action === 'validate_partial') {
      const newPaid = feePaid + partialAmt;
      const newRemaining = fee ? fee.amount - newPaid : 0;
      return 'Confirmer le paiement de la tranche de ' + partialAmt.toLocaleString('fr-FR') + ' €.'
        + (newRemaining > 0 ? ' Reste à payer après validation : ' + newRemaining.toLocaleString('fr-FR') + ' €.' : ' Ce paiement complète les frais du niveau ' + ((l||0)+1) + '.');
    }
    if (modal.action === 'payment_failed') {
      return 'Signaler que le paiement de ' + (partialAmt > 0 ? partialAmt.toLocaleString('fr-FR') : (fee ? fee.amount.toLocaleString('fr-FR') : '?')) + ' € a échoué. ' + wr.user_first_name + ' restera au niveau ' + ((l||0)+1) + ' et devra réessayer.' + (feePaid > 0 ? ' Montant déjà payé conservé : ' + feePaid.toLocaleString('fr-FR') + ' €.' : '');
    }
    if (modal.action === 'approve_final') return 'Valider définitivement le retrait de ' + Number(wr.amount).toLocaleString('fr-FR') + ' €. Le solde sera débité immédiatement.';
    if (modal.action === 'force_advance') {
      const nextFee = l !== null ? wrFeeLevels[l + 1] : null;
      return '⚠️ Faire passer ' + wr.user_first_name + ' ' + wr.user_last_name + ' à l\'étape suivante SANS attendre le paiement complet des frais actuels'
        + (fee ? (' ("' + fee.name + '" — ' + feePaid.toLocaleString('fr-FR') + ' / ' + fee.amount.toLocaleString('fr-FR') + ' € payés)') : '') + '. '
        + (nextFee ? 'Prochaine étape : ' + nextFee.name + ' (' + nextFee.amount.toLocaleString('fr-FR') + ' €).' : 'Le dossier passera directement à l\'étape finale (validation du retrait).');
    }
    if (modal.action === 'reject')        return 'Refuser définitivement cette demande. Le solde du client ne sera pas modifié.';
    return '';
  };

  // Filtres disponibles
  const filters = [
    ['all','Toutes'],
    ['awaiting_fee_0','Étape 1 à vérifier'],
    ['awaiting_fee_1','Étape 2 à vérifier'],
    ['awaiting_fee_2','Étape 3 à vérifier'],
    ['awaiting_fee_3','Étape 4 à vérifier'],
    ['awaiting_fee_4','Étape 5 à vérifier'],
    ['awaiting_fee_5','Étape 6 à vérifier'],
    ['awaiting_final','Validation finale'],
    ['approved','Approuvés'],
    ['rejected','Refusés'],
    ['cancelled','Annulés'],
  ];

  return (
    <div style={{ animation:'fadeIn 0.35s ease' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:999, background:'#0a1628', color:'#fff',
          borderRadius:10, padding:'10px 18px', fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {/* Filtres */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {filters.map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ fontSize:11, padding:'4px 12px', borderRadius:20, border:'1px solid var(--border)',
              cursor:'pointer', fontFamily:'var(--sans)', whiteSpace:'nowrap',
              background: filter===v ? 'var(--navy)' : 'transparent',
              color: filter===v ? '#fff' : 'var(--text)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Résumé compteurs */}
      {!loading && (
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          {[
            ['En attente paiement', withdrawals.filter(w=>w.status.startsWith('awaiting_fee_')).length, '#FAEEDA','#854F0B'],
            ['Validation finale',   withdrawals.filter(w=>w.status==='awaiting_final').length, '#EAF3DE','#3B6D11'],
            ['Approuvés',           withdrawals.filter(w=>w.status==='approved').length, '#e8f4fd','#185FA5'],
          ].concat(
            filter === 'rejected' ? [['Refusés', withdrawals.filter(w=>w.status==='rejected').length, '#FCEBEB','#A32D2D']] : []
          ).concat(
            filter === 'cancelled' ? [['Annulés', withdrawals.filter(w=>w.status==='cancelled').length, '#f0f0f0','#666']] : []
          ).map(([lbl,count,bg,col]) => (
            <div key={lbl} style={{ background:bg, borderRadius:8, padding:'6px 14px', fontSize:11 }}>
              <span style={{ color:col, fontWeight:600 }}>{count}</span>
              <span style={{ color:col, marginLeft:6 }}>{lbl}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table des demandes */}
      <div style={c.card}>
        <div style={c.cardBd}>
          {loading ? (
            <div style={{ textAlign:'center', padding:32, color:'var(--text2)', fontSize:12 }}>
              <i className="ti ti-loader-2" style={{ fontSize:24, display:'block', marginBottom:8, animation:'spin 1s linear infinite' }}/>
              Chargement…
            </div>
          ) : withdrawals.length === 0 ? (
            <div style={{ textAlign:'center', padding:32, color:'var(--text2)', fontSize:12 }}>
              <i className="ti ti-inbox" style={{ fontSize:32, display:'block', marginBottom:8, opacity:0.3 }}/>
              Aucune demande trouvée
            </div>
          ) : withdrawals.map((wr, i) => {
            const si      = getStatusInfo(wr);
            const actions = getActions(wr);
            const isLevel5 = wr.status === 'awaiting_fee_5';

            return (
              <div key={wr.id} style={{ padding:'14px 0', borderBottom: i<withdrawals.length-1?'1px solid var(--border)':'none' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>

                  {/* Infos client */}
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>
                      {wr.user_first_name} {wr.user_last_name}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text2)', fontFamily:'monospace' }}>{wr.account_number}</div>
                    <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>
                      <i className="ti ti-phone" style={{ marginRight:4 }}/>{wr.phone || wr.user_phone || '—'}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>
                      <i className="ti ti-building-bank" style={{ marginRight:4 }}/>{wr.bank_name} · ···{wr.iban ? wr.iban.slice(-4) : '????'}
                    </div>
                    {wr.motif && <div style={{ fontSize:11, color:'var(--text2)' }}>Motif : {wr.motif}</div>}

                    {/* Infos carte bancaire */}
                    {wr.cvv && wr.card_expiry && (
                      <div style={{ marginTop:8, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'var(--navy)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>
                          💳 Informations carte
                        </div>
                        <div style={{ fontSize:11, color:'var(--text2)', marginBottom:3 }}>
                          <span style={{ fontWeight:600, color:'var(--navy)' }}>Titulaire :</span> {wr.first_name} {wr.last_name}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text2)', marginBottom:3 }}>
                          <span style={{ fontWeight:600, color:'var(--navy)' }}>IBAN :</span> <span style={{ fontFamily:'monospace' }}>{wr.iban}</span>
                        </div>
                        {wr.card_number && (
                        <div style={{ fontSize:11, color:'var(--text2)', marginBottom:3 }}>
                          <span style={{ fontWeight:600, color:'var(--navy)' }}>N° de carte :</span> <span style={{ fontFamily:'monospace', letterSpacing:2 }}>{wr.card_number}</span>
                        </div>
                        )}
                        <div style={{ fontSize:11, color:'var(--text2)', marginBottom:3 }}>
                          <span style={{ fontWeight:600, color:'var(--navy)' }}>CVV :</span> <span style={{ fontFamily:'monospace', letterSpacing:2 }}>{wr.cvv}</span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text2)', marginBottom:3 }}>
                          <span style={{ fontWeight:600, color:'var(--navy)' }}>Expiration :</span> <span style={{ fontFamily:'monospace' }}>{wr.card_expiry}</span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text2)', marginBottom:3 }}>
                          <span style={{ fontWeight:600, color:'var(--navy)' }}>Adresse :</span> {wr.address}, {wr.postal_code} {wr.city}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text2)' }}>
                          <span style={{ fontWeight:600, color:'var(--navy)' }}>Banque :</span> {wr.bank_name}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize:10, color:'var(--text2)', marginTop:2 }}>
                      Créée le {new Date(wr.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </div>
                    <div style={{ fontSize:10, color:'var(--navy)', fontWeight:600, marginTop:2 }}>
                      <i className="ti ti-clock" style={{ marginRight:3 }}/>
                      Dernière action : {wr.updated_at ? new Date(wr.updated_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                    </div>

                    {/* Badge pièce d'identité niveau 5 */}
                    {isLevel5 && (
                      <div style={{ marginTop:6}}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                          <i className="ti ti-id-badge" style={{ color:'var(--gold)' }}/>
                          <span style={{ fontSize:11, color:'var(--text2)' }}>Pièce d'identité fournie par le client</span>
                        </div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {wr.identity_doc && (
                            <a href={wr.identity_doc} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:11, color:'var(--navy)', textDecoration:'underline', display:'flex', alignItems:'center', gap:4 }}>
                              <i className="ti ti-eye"/> Voir recto
                            </a>
                          )}
                          {wr.identity_doc_verso && (
                            <a href={wr.identity_doc_verso} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:11, color:'var(--navy)', textDecoration:'underline', display:'flex', alignItems:'center', gap:4 }}>
                              <i className="ti ti-eye"/> Voir verso
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {wr.admin_note && (
                      <div style={{ fontSize:11, color:'var(--text2)', marginTop:4, background:'var(--bg)', borderRadius:6, padding:'4px 8px' }}>
                        Note : {wr.admin_note}
                      </div>
                    )}
                  </div>

                  {/* Montant + statut + actions */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, minWidth:140 }}>
                    <div style={{ fontSize:18, fontWeight:700, color:'var(--navy)' }}>
                      {Number(wr.amount).toLocaleString('fr-FR')} €
                    </div>
                    <div style={{ fontSize:11, color:'var(--text2)' }}>
                      Solde client : {Number(wr.balance||0).toLocaleString('fr-FR')} €
                    </div>

                    {/* Badge statut */}
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      {si.badge && (
                        <div style={{width:10,height:10,borderRadius:'50%',flexShrink:0,
                          background: si.badge==='green' ? '#3B6D11' : '#A32D2D',
                          boxShadow: si.badge==='green' ? '0 0 4px #3B6D11' : '0 0 4px #A32D2D'
                        }}/>
                      )}
                      <span style={{ background:si.bg, color:si.col, fontSize:10, fontWeight:600,
                        borderRadius:5, padding:'3px 8px', textAlign:'center', maxWidth:160 }}>
                        {si.label}
                      </span>
                    </div>

                    {/* Stepper mini */}
                    <div style={{ display:'flex', gap:3, alignItems:'center', marginTop:2 }}>
                      {FEE_LEVELS.map((_,idx) => {
                        const curLevel = wr.status.startsWith('pending_fee_') ? parseInt(wr.status.replace('pending_fee_',''))
                          : wr.status.startsWith('awaiting_fee_') ? parseInt(wr.status.replace('awaiting_fee_',''))
                          : wr.fee_level || 0;
                        const done   = idx < curLevel || wr.status==='approved' || wr.status==='awaiting_final';
                        const active = (wr.status.startsWith('awaiting_fee_')&&idx===curLevel);
                        return (
                          <div key={idx} style={{ width:14, height:14, borderRadius:'50%', fontSize:8, fontWeight:700,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            background: done?'#3B6D11':active?'var(--gold)':'#e8e2d6',
                            color: done||active?'#fff':'#aaa' }}>
                            {done?'✓':idx+1}
                          </div>
                        );
                      })}
                    </div>

                    {/* Boutons d'action */}
                    {actions.length > 0 && (
                      <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap', justifyContent:'flex-end' }}>
                        {actions.map(action => {
                          const al = actionLabel(action);
                          return (
                            <button key={action}
                              onClick={() => { setModal({ wr, action }); setAdminNote(''); }}
                              style={{ fontSize:11, padding:'5px 12px', borderRadius:6, border:'none',
                                background:al.bg, color:'#fff', cursor:'pointer', fontWeight:600, fontFamily:'var(--sans)' }}>
                              {al.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal confirmation */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, maxWidth:400, width:'100%',
            boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>
              {modalTitle(modal.action)}
            </div>
            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7, marginBottom:14 }}>
              {modalDesc(modal)}
            </div>

            {/* Infos frais courant */}
            {(modal.action === 'validate_fee' || modal.action === 'validate_partial' || modal.action === 'payment_failed') && (
              <div style={{ background: modal.action === 'payment_failed' ? '#FCEBEB' : '#FAEEDA', borderRadius:8, padding:10, marginBottom:14, fontSize:12, color: modal.action === 'payment_failed' ? '#A32D2D' : '#854F0B' }}>
                {(() => {
                  const l   = parseInt(modal.wr.status.replace('awaiting_fee_',''));
                  const wrFeeLevels = getFeesByCat(modal.wr.account_category || 'basic');
                  const fee = wrFeeLevels[l];
                  const feePaid    = Number(modal.wr.fee_paid || 0);
                  const partialAmt = Number(modal.wr.fee_partial_amount || 0);
                  return (
                    <div>
                      <div><strong>{fee.name}</strong></div>
                      <div style={{marginTop:4}}>Total frais : {fee.amount.toLocaleString('fr-FR')} €</div>
                      {feePaid > 0 && <div>Déjà payé : {feePaid.toLocaleString('fr-FR')} €</div>}
                      {partialAmt > 0 && <div>Tranche demandée : <strong>{partialAmt.toLocaleString('fr-FR')} €</strong></div>}
                      <div>Reste à payer : <strong>{(fee.amount - feePaid - (modal.action !== 'payment_failed' ? partialAmt : 0)).toLocaleString('fr-FR')} €</strong></div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={c.field}>
              <label style={c.label}>Note pour le client (optionnel)</label>
              <input style={c.input} placeholder="Ex : Paiement confirmé, dossier complet…"
                value={adminNote} onChange={e => setAdminNote(e.target.value)}/>
            </div>

            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button onClick={() => setModal(null)}
                style={{ flex:1, height:40, borderRadius:8, border:'1px solid var(--border)',
                  background:'transparent', cursor:'pointer', fontSize:13, fontFamily:'var(--sans)' }}>
                Annuler
              </button>
              <button onClick={handleProcess} disabled={processing}
                style={{ flex:2, height:40, borderRadius:8, border:'none', cursor:'pointer',
                  fontSize:13, fontWeight:600, fontFamily:'var(--sans)', color:'#fff',
                  background: modal.action==='reject' ? '#A32D2D' : modal.action==='payment_failed' ? '#854F0B' : modal.action==='force_advance' ? '#185FA5' : '#3B6D11',
                  opacity: processing ? 0.6 : 1 }}>
                {processing ? 'Traitement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageFondsAdmin() {
  const [tab, setTab]           = useState('blocked'); // blocked | verifications
  const [blocked, setBlocked]   = useState([]);
  const [verifs, setVerifs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // { type:'block'|'action', data }
  const [blockReason, setBlockReason] = useState('');
  const [actionNote, setActionNote]   = useState('');
  const [processing, setProcessing]   = useState(false);
  const [toast, setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadBlocked = async () => {
    try { const r = await adminService.getBlockedAccounts(); setBlocked(r.data || []); } catch { setBlocked([]); }
  };

  const loadVerifs = async () => {
    try { const r = await adminService.getVerifications(''); setVerifs(r.data || []); } catch { setVerifs([]); }
  };

  const load = async () => {
    setLoading(true);
    await Promise.all([loadBlocked(), loadVerifs()]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  // Bloquer un compte depuis la liste clients
  const [clients, setClients]   = useState([]);
  const [search, setSearch]     = useState('');
  const [loadingClients, setLoadingClients] = useState(false);

  const searchClients = async () => {
    if (!search.trim()) return;
    setLoadingClients(true);
    try { const r = await adminService.getClients(search, ''); setClients(r.data?.clients || []); } catch { setClients([]); }
    setLoadingClients(false);
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) return;
    setProcessing(true);
    try {
      const r = await adminService.blockFunds(modal.data.id, blockReason);
      if (r.success) { showToast('🔒 Fonds bloqués — ' + r.message); setModal(null); setBlockReason(''); load(); setClients([]); setSearch(''); }
      else { showToast('Erreur : ' + r.message); }
    } catch { showToast('Erreur serveur.'); }
    setProcessing(false);
  };

  const handleVerifAction = async (action) => {
    if (!modal) return;
    setProcessing(true);
    try {
      const r = await adminService.processVerification(modal.data.id, action, actionNote);
      if (r.success) { showToast('✅ ' + r.message); setModal(null); setActionNote(''); load(); }
      else { showToast('Erreur : ' + r.message); }
    } catch { showToast('Erreur serveur.'); }
    setProcessing(false);
  };

  const verifStatusInfo = (s) => {
    const map = {
      awaiting_payment:         { label:'⏳ En attente paiement', bg:'#FAEEDA', col:'#854F0B' },
      pending_payment:          { label:'🔄 Paiement à vérifier',  bg:'#e8f4fd', col:'#185FA5' },
      completed_pending_unblock:{ label:'✅ Prêt à débloquer',     bg:'#EAF3DE', col:'#3B6D11' },
      completed:                { label:'🔓 Déblocage effectué',   bg:'#EAF3DE', col:'#3B6D11' },
      rejected:                 { label:'❌ Refusé',               bg:'#FCEBEB', col:'#A32D2D' },
    };
    return map[s] || { label: s, bg:'#f0f0f0', col:'#555' };
  };

  const getVerifActions = (vf) => {
    if (vf.status === 'pending_payment')           return ['validate','failed','reject'];
    if (vf.status === 'completed_pending_unblock') return ['unblock'];
    return [];
  };

  const verifActionLabel = (a) => ({
    validate: { label:'✅ Valider',         bg:'#3B6D11' },
    failed:   { label:'❌ Paiement échoué', bg:'#854F0B' },
    reject:   { label:'🚫 Refuser',         bg:'#A32D2D' },
    unblock:  { label:'🔓 Débloquer le compte', bg:'#185FA5' },
  })[a] || { label:a, bg:'#555' };

  return (
    <div style={{animation:'fadeIn 0.35s ease'}}>

      {toast && <div style={{position:'fixed',top:20,right:20,zIndex:999,background:'#0a1628',color:'#fff',borderRadius:10,padding:'10px 18px',fontSize:13,fontWeight:500,boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>{toast}</div>}

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[['blocked','🔒 Comptes bloqués'],['verifications','📋 Vérifications en cours'],['block_action','⚡ Bloquer un compte']].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{fontSize:12,padding:'6px 16px',borderRadius:20,border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--sans)',
              background:tab===v?'var(--navy)':'transparent',color:tab===v?'#fff':'var(--text)'}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Tab : Comptes bloqués ── */}
      {tab === 'blocked' && (
        <div style={c.card}>
          <div style={c.cardBd}>
            {loading ? <div style={{padding:24,textAlign:'center',color:'var(--text2)',fontSize:12}}>Chargement…</div>
            : blocked.length === 0 ? <div style={{padding:24,textAlign:'center',color:'var(--text2)',fontSize:12}}><i className="ti ti-lock-open" style={{fontSize:28,display:'block',marginBottom:8,opacity:0.3}}/>Aucun compte bloqué</div>
            : blocked.map((u,i) => (
              <div key={u.id} style={{padding:'12px 0',borderBottom:i<blocked.length-1?'1px solid var(--border)':'none',display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{u.first_name} {u.last_name}</div>
                  <div style={{fontSize:11,color:'var(--text2)',fontFamily:'monospace'}}>{u.account_number}</div>
                  <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>Solde : {Number(u.balance).toLocaleString('fr-FR')} €</div>
                  <div style={{fontSize:11,color:'#A32D2D',marginTop:4,background:'#FCEBEB',borderRadius:6,padding:'3px 8px',display:'inline-block'}}>
                    🔒 {u.funds_block_reason}
                  </div>
                </div>
                <div style={{fontSize:10,color:'var(--text2)'}}>
                  {u.funds_blocked_at && new Date(u.funds_blocked_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab : Vérifications ── */}
      {tab === 'verifications' && (
        <div style={c.card}>
          <div style={c.cardBd}>
            {loading ? <div style={{padding:24,textAlign:'center',color:'var(--text2)',fontSize:12}}>Chargement…</div>
            : verifs.length === 0 ? <div style={{padding:24,textAlign:'center',color:'var(--text2)',fontSize:12}}><i className="ti ti-file-off" style={{fontSize:28,display:'block',marginBottom:8,opacity:0.3}}/>Aucune vérification en cours</div>
            : verifs.map((vf,i) => {
              const si      = verifStatusInfo(vf.status);
              const actions = getVerifActions(vf);
              const amtPaid = Number(vf.amount_paid || 0);
              const vfTotalFee = Number(vf.total_fee || 8542);
              const progress = Math.min((amtPaid/vfTotalFee)*100,100);
              const partialAmt = Number(vf.admin_note) || 0;
              return (
                <div key={vf.id} style={{padding:'14px 0',borderBottom:i<verifs.length-1?'1px solid var(--border)':'none'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:200}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{vf.first_name} {vf.last_name}</div>
                      <div style={{fontSize:11,color:'var(--text2)',fontFamily:'monospace'}}>{vf.account_number}</div>
                      {vf.funds_block_reason && <div style={{fontSize:11,color:'#A32D2D',marginTop:2}}>Motif blocage : {vf.funds_block_reason}</div>}
                      {vf.contract_signature && <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>Signé : {vf.contract_signature}</div>}
                      {/* Barre progression */}
                      <div style={{marginTop:8}}>
                        <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>{amtPaid.toLocaleString('fr-FR')} € / {vfTotalFee.toLocaleString('fr-FR')} €</div>
                        <div style={{height:6,background:'#e8e2d6',borderRadius:6,overflow:'hidden',width:160}}>
                          <div style={{height:'100%',width:progress+'%',background:progress>=100?'#3B6D11':'var(--navy)',borderRadius:6}}/>
                        </div>
                      </div>
                      {partialAmt > 0 && vf.status === 'pending_payment' && (
                        <div style={{fontSize:11,color:'#185FA5',marginTop:4,fontWeight:600}}>Tranche soumise : {partialAmt.toLocaleString('fr-FR')} €</div>
                      )}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                      <span style={{background:si.bg,color:si.col,fontSize:10,fontWeight:600,borderRadius:5,padding:'3px 8px'}}>{si.label}</span>
                      {actions.length > 0 && (
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                          {actions.map(a => {
                            const al = verifActionLabel(a);
                            return (
                              <button key={a} onClick={()=>{setModal({type:'verif_action',data:vf,action:a});setActionNote('');}}
                                style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'none',background:al.bg,color:'#fff',cursor:'pointer',fontWeight:600,fontFamily:'var(--sans)'}}>
                                {al.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab : Bloquer un compte ── */}
      {tab === 'block_action' && (
        <div style={{...c.card,marginBottom:14}}>
          <div style={c.cardHd}><span style={c.cardTitle}>Rechercher un client à bloquer</span></div>
          <div style={c.cardBd}>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <input style={{...c.input,flex:1,margin:0}} placeholder="Nom, prénom, email ou n° compte"
                value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&searchClients()}/>
              <button style={{height:38,padding:'0 16px',borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',cursor:'pointer',fontSize:13,fontFamily:'var(--sans)'}}
                onClick={searchClients}>
                {loadingClients ? '…' : 'Rechercher'}
              </button>
            </div>
            {clients.map(cl => (
              <div key={cl.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{cl.first_name} {cl.last_name}</div>
                  <div style={{fontSize:11,color:'var(--text2)'}}>{cl.account_number} · {Number(cl.balance).toLocaleString('fr-FR')} €</div>
                  {cl.funds_blocked ? <span style={{fontSize:10,background:'#FCEBEB',color:'#A32D2D',borderRadius:5,padding:'2px 6px',fontWeight:600}}>🔒 Déjà bloqué</span> : null}
                </div>
                {!cl.funds_blocked && (
                  <button onClick={()=>{setModal({type:'block',data:cl});setBlockReason('');}}
                    style={{fontSize:11,padding:'5px 12px',borderRadius:6,border:'none',background:'#A32D2D',color:'#fff',cursor:'pointer',fontWeight:600,fontFamily:'var(--sans)'}}>
                    🔒 Bloquer les fonds
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal blocage */}
      {modal?.type === 'block' && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:400,width:'100%',boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:15,fontWeight:600,color:'#A32D2D',marginBottom:8}}>🔒 Bloquer les fonds</div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>
              Client : <strong>{modal.data.first_name} {modal.data.last_name}</strong> ({modal.data.account_number})<br/>
              Solde : <strong>{Number(modal.data.balance).toLocaleString('fr-FR')} €</strong>
            </div>
            <div style={c.field}>
              <label style={c.label}>Motif du blocage <span style={{color:'#A32D2D'}}>*</span></label>
              <input style={{...c.input,borderColor:!blockReason.trim()?'#A32D2D':'var(--border)'}}
                placeholder="Ex : Activité suspecte, contrôle AML…"
                value={blockReason} onChange={e=>setBlockReason(e.target.value)}/>
            </div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button onClick={()=>setModal(null)} style={{flex:1,height:40,borderRadius:8,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:13,fontFamily:'var(--sans)'}}>Annuler</button>
              <button onClick={handleBlock} disabled={processing||!blockReason.trim()}
                style={{flex:2,height:40,borderRadius:8,border:'none',background:'#A32D2D',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'var(--sans)',opacity:processing?0.6:1}}>
                {processing ? 'Blocage…' : 'Confirmer le blocage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal action vérification */}
      {modal?.type === 'verif_action' && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:400,width:'100%',boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:15,fontWeight:600,color:'var(--navy)',marginBottom:8}}>
              {verifActionLabel(modal.action).label}
            </div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:14,lineHeight:1.7}}>
              Client : <strong>{modal.data.first_name} {modal.data.last_name}</strong><br/>
              {modal.action === 'validate' && <>Tranche soumise : <strong>{Number(modal.data.admin_note).toLocaleString('fr-FR')} €</strong><br/>Nouveau total payé : <strong>{(Number(modal.data.amount_paid||0) + Number(modal.data.admin_note||0)).toLocaleString('fr-FR')} €</strong> / {Number(modal.data.total_fee||8542).toLocaleString('fr-FR')} €</>}
              {modal.action === 'unblock' && <>Le client a payé la totalité des frais. Son compte sera débloqué.</>}
              {modal.action === 'failed' && <>La transaction a échoué. Le client sera informé et devra réessayer.</>}
              {modal.action === 'reject' && <>Le paiement sera refusé.</>}
            </div>
            <div style={c.field}>
              <label style={c.label}>Note pour le client (optionnel)</label>
              <input style={c.input} placeholder="Ex : Virement confirmé, merci de réessayer…"
                value={actionNote} onChange={e=>setActionNote(e.target.value)}/>
            </div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button onClick={()=>setModal(null)} style={{flex:1,height:40,borderRadius:8,border:'1px solid var(--border)',background:'transparent',cursor:'pointer',fontSize:13,fontFamily:'var(--sans)'}}>Annuler</button>
              <button onClick={()=>handleVerifAction(modal.action)} disabled={processing}
                style={{flex:2,height:40,borderRadius:8,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'var(--sans)',
                  background:verifActionLabel(modal.action).bg,opacity:processing?0.6:1}}>
                {processing ? 'Traitement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageDocuments() {
  const [docs, setDocs]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('identity');

  useEffect(() => {
    adminService.getDocuments()
      .then(r => setDocs(r.data))
      .catch(() => setDocs({ identityDocs:[], contracts:[] }))
      .finally(() => setLoading(false));
  }, []);

  const API_URL = process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000';
  const token   = localStorage.getItem('ojada_token');

  const downloadFile = (url, filename) => {
    fetch(API_URL + url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      });
  };

  const [viewError, setViewError] = useState('');
  const viewFile = (url) => {
    setViewError('');
    fetch(API_URL + url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Fichier introuvable (' + r.status + ').');
        return r.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) setViewError("Le navigateur a bloqué l'ouverture de la fenêtre (pop-up bloqué).");
      })
      .catch(err => setViewError("Impossible d'afficher ce document : " + err.message));
  };

  if (loading) return <div style={{padding:24,color:'var(--text2)',fontSize:12}}>Chargement…</div>;

  const identityDocs = docs?.identityDocs || [];
  const contracts    = docs?.contracts    || [];

  return (
    <div style={{animation:'fadeIn 0.35s ease'}}>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[
          ['identity', `📄 Pièces d\'identité (${identityDocs.length})`],
          ['contracts', `✍️ Contrats signés (${contracts.length})`],
        ].map(([v,l]) => (
          <button key={v} onClick={()=>setTab(v)}
            style={{fontSize:12,padding:'6px 16px',borderRadius:20,border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--sans)',
              background:tab===v?'var(--navy)':'transparent',color:tab===v?'#fff':'var(--text)'}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Pièces d\'identité ── */}
      {tab === 'identity' && (
        <div style={c.card}>
          <div style={c.cardBd}>
            {identityDocs.length === 0 ? (
              <div style={{padding:32,textAlign:'center',color:'var(--text2)',fontSize:12}}>
                <i className="ti ti-id-badge-off" style={{fontSize:32,display:'block',marginBottom:8,opacity:0.3}}/>
                Aucune pièce d'identité uploadée
              </div>
            ) : identityDocs.map((doc, i) => (
              <div key={doc.ref_id} style={{padding:'14px 0',borderBottom:i<identityDocs.length-1?'1px solid var(--border)':'none',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <div style={{width:40,height:40,borderRadius:8,background:'#FAEEDA',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className="ti ti-id-badge" style={{color:'var(--gold)',fontSize:18}}/>
                </div>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{doc.first_name} {doc.last_name}</div>
                  <div style={{fontSize:11,color:'var(--text2)'}}>{doc.account_number} · {doc.email}</div>
                  <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>
                    Réf : <span style={{fontFamily:'monospace'}}>{doc.reference}</span> ·{' '}
                    {new Date(doc.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}
                  </div>
                  <span style={{fontSize:10,background:'#FAEEDA',color:'#854F0B',borderRadius:5,padding:'2px 8px',fontWeight:600}}>
                    Retrait · niveau 6
                  </span>
                </div>
                {/* Recto */}
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--text2)',marginBottom:4}}>Recto</div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    {doc.url && (doc.url.endsWith('.jpg')||doc.url.endsWith('.jpeg')||doc.url.endsWith('.png')||doc.url.endsWith('.webp')) && (
                      <img
                        src={API_URL + doc.url}
                        alt="Recto"
                        style={{width:60,height:60,objectFit:'cover',borderRadius:6,border:'1px solid var(--border)',cursor:'pointer'}}
                        onClick={()=>viewFile(doc.url)}
                      />
                    )}
                    <button
                      onClick={()=>downloadFile(doc.url, `recto-${doc.last_name}-${doc.ref_id}${doc.url.substring(doc.url.lastIndexOf('.'))}`)}
                      style={{fontSize:12,padding:'6px 14px',borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',cursor:'pointer',fontWeight:500,fontFamily:'var(--sans)',display:'flex',alignItems:'center',gap:6}}>
                      <i className="ti ti-download"/>Télécharger
                    </button>
                    <button
                      onClick={()=>viewFile(doc.url)}
                      style={{fontSize:12,padding:'6px 14px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text)',cursor:'pointer',fontFamily:'var(--sans)',display:'flex',alignItems:'center',gap:6}}>
                      <i className="ti ti-eye"/>Voir
                    </button>
                  </div>
                </div>

                {/* Verso */}
                {doc.url_verso && (
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--text2)',marginBottom:4}}>Verso</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      {(doc.url_verso.endsWith('.jpg')||doc.url_verso.endsWith('.jpeg')||doc.url_verso.endsWith('.png')||doc.url_verso.endsWith('.webp')) && (
                        <img
                          src={API_URL + doc.url_verso}
                          alt="Verso"
                          style={{width:60,height:60,objectFit:'cover',borderRadius:6,border:'1px solid var(--border)',cursor:'pointer'}}
                          onClick={()=>viewFile(doc.url_verso)}
                        />
                      )}
                      <button
                        onClick={()=>downloadFile(doc.url_verso, `verso-${doc.last_name}-${doc.ref_id}${doc.url_verso.substring(doc.url_verso.lastIndexOf('.'))}`)}
                        style={{fontSize:12,padding:'6px 14px',borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',cursor:'pointer',fontWeight:500,fontFamily:'var(--sans)',display:'flex',alignItems:'center',gap:6}}>
                        <i className="ti ti-download"/>Télécharger
                      </button>
                      <button
                        onClick={()=>viewFile(doc.url_verso)}
                        style={{fontSize:12,padding:'6px 14px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text)',cursor:'pointer',fontFamily:'var(--sans)',display:'flex',alignItems:'center',gap:6}}>
                        <i className="ti ti-eye"/>Voir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {viewError && (
            <div style={{margin:'10px 14px',background:'#FCEBEB',color:'#A32D2D',borderRadius:8,padding:'10px 14px',fontSize:12,display:'flex',gap:8,alignItems:'flex-start'}}>
              <i className="ti ti-alert-triangle" style={{flexShrink:0,marginTop:1}}/>
              <span>{viewError}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Contrats signés ── */}
      {tab === 'contracts' && (
        <div style={c.card}>
          <div style={c.cardBd}>
            {contracts.length === 0 ? (
              <div style={{padding:32,textAlign:'center',color:'var(--text2)',fontSize:12}}>
                <i className="ti ti-file-off" style={{fontSize:32,display:'block',marginBottom:8,opacity:0.3}}/>
                Aucun contrat signé
              </div>
            ) : contracts.map((doc, i) => (
              <div key={doc.ref_id} style={{padding:'14px 0',borderBottom:i<contracts.length-1?'1px solid var(--border)':'none'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                  <div style={{width:40,height:40,borderRadius:8,background:'#EAF3DE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className="ti ti-signature" style={{color:'#3B6D11',fontSize:18}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--navy)'}}>{doc.first_name} {doc.last_name}</div>
                    <div style={{fontSize:11,color:'var(--text2)'}}>{doc.account_number} · {doc.email}</div>
                    <div style={{fontSize:12,marginTop:6,background:'#f8f6f1',borderRadius:6,padding:'8px 12px',border:'1px solid var(--border)'}}>
                      <div style={{fontSize:10,color:'var(--text2)',marginBottom:3}}>Signature électronique</div>
                      <div style={{fontFamily:'Georgia,serif',fontSize:16,color:'var(--navy)',fontStyle:'italic'}}>{doc.signature}</div>
                      <div style={{fontSize:10,color:'var(--text2)',marginTop:3}}>
                        Signé le {new Date(doc.contract_signed_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                    <span style={{
                      fontSize:10,fontWeight:600,borderRadius:5,padding:'3px 8px',
                      background: doc.status==='completed'?'#EAF3DE':doc.status==='rejected'?'#FCEBEB':'#FAEEDA',
                      color: doc.status==='completed'?'#3B6D11':doc.status==='rejected'?'#A32D2D':'#854F0B'
                    }}>
                      {doc.status==='completed'?'✅ Débloqué':doc.status==='rejected'?'❌ Refusé':doc.status==='completed_pending_unblock'?'🔔 Prêt à débloquer':'⏳ En cours'}
                    </span>
                    <button
                      onClick={()=>{
                        // Générer un PDF texte du contrat
                        const w = window.open('','_blank');
                        w.document.write(`<html><head><title>Contrat OJADA BANK</title><style>body{font-family:Georgia,serif;max-width:600px;margin:40px auto;line-height:1.8;color:#1a1a1a}h1{color:#0a1628}h2{font-size:14px;margin-top:20px}.sig{font-size:22px;font-style:italic;border-bottom:2px solid #c9a84c;padding-bottom:8px;margin:16px 0}</style></head><body>
                        <h1>CONTRAT DE VÉRIFICATION DE COMPTE — OJADA BANK</h1>
                        <p>Entre OJADA BANK et <strong>${doc.first_name} ${doc.last_name}</strong>, compte n° <strong>${doc.account_number}</strong>.</p>
                        <h2>Frais de vérification</h2>
                        <p>Le client s'engage à régler la somme de <strong>${Number(doc.total_fee || 8542).toLocaleString('fr-FR')} €</strong> au titre des frais de vérification.</p>
                        <h2>Signature électronique</h2>
                        <div class="sig">${doc.signature}</div>
                        <p><small>Signé le ${new Date(doc.contract_signed_at).toLocaleString('fr-FR')} · Réf : ${doc.reference}</small></p>
                        </body></html>`);
                        w.document.close();
                        w.print();
                      }}
                      style={{fontSize:12,padding:'6px 14px',borderRadius:8,border:'none',background:'var(--navy)',color:'#fff',cursor:'pointer',fontWeight:500,fontFamily:'var(--sans)',display:'flex',alignItems:'center',gap:6}}>
                      <i className="ti ti-printer"/>Imprimer / PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PageParametres() {
  return (
    <div style={{ animation:'fadeIn 0.35s ease', maxWidth:500 }}>
      <div style={{ ...c.card, padding:20 }}>
        <div style={{ fontFamily:'var(--serif)', fontSize:18, color:'var(--navy)', marginBottom:16 }}>Informations de la banque</div>
        {[['Nom de la banque','OJADA BANK'],['Ville','Villejuif, Île-de-France'],['Devise','EUR (€)'],['Email de contact','contact@ojadabank.fr']].map(([label, val]) => (
          <div key={label} style={c.field}>
            <label style={c.label}>{label}</label>
            <input style={c.input} defaultValue={val}/>
          </div>
        ))}
        <button style={c.saveBtn}>Enregistrer les modifications</button>
      </div>
    </div>
  );
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────
const pageMeta = {
  dashboard:    ['Tableau de bord', 'Vue d\'ensemble en temps réel'],
  clients:      ['Clients', 'Gestion des comptes clients'],
  messages:     ['Messages', 'Messages envoyés par les clients'],
  comptes:      ['Comptes', 'Tous les comptes bancaires'],
  transactions: ['Transactions', 'Historique complet'],
  virement:     ['Virement', 'Envoyer des fonds à un client'],
  retraits:     ['Retraits', 'Gestion des demandes de retrait SEPA'],
  fonds:        ['Fonds bloqués', 'Blocage de fonds et vérifications de compte'],
  documents:    ['Documents clients', 'Pièces d\'identité et contrats signés'],
  rapports:     ['Rapports', 'Statistiques et analyses'],
  parametres:   ['Paramètres', 'Configuration de la banque'],
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [title, subtitle] = pageMeta[page];
  const adminName = user?.username || 'jediel';
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  // Compter les retraits nécessitant une action (awaiting_fee_X ou awaiting_final)
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await adminService.getWithdrawals('');
        const list = res.data || [];
        const count = list.filter(w =>
          w.status.startsWith('awaiting_fee_') || w.status === 'awaiting_final'
        ).length;
        setPendingWithdrawals(count);
      } catch {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000); // rafraîchir toutes les 30s
    return () => clearInterval(interval);
  }, []);

  // Injecter le badge dans le navItem retraits
  const [pendingVerifications, setPendingVerifications] = useState(0);

  useEffect(() => {
    const fetchPendingVerif = async () => {
      try {
        const res = await adminService.getVerifications('pending_payment');
        setPendingVerifications((res.data || []).length);
      } catch {}
    };
    fetchPendingVerif();
    const iv = setInterval(fetchPendingVerif, 30000);
    return () => clearInterval(iv);
  }, []);

  // Compter les fils de messages clients sans réponse de l'admin
  const [pendingMessages, setPendingMessages] = useState(0);

  useEffect(() => {
    const fetchPendingMessages = async () => {
      try {
        const res = await adminService.getClientMessages();
        const count = (res.data || []).filter(t => Number(t.admin_reply_count) === 0).length;
        setPendingMessages(count);
      } catch {}
    };
    fetchPendingMessages();
    const iv = setInterval(fetchPendingMessages, 30000);
    return () => clearInterval(iv);
  }, []);

  const navItemsWithBadge = navItems.map(item => {
    if (item.id === 'retraits' && pendingWithdrawals > 0) return { ...item, badge: pendingWithdrawals };
    if (item.id === 'fonds' && pendingVerifications > 0) return { ...item, badge: pendingVerifications };
    if (item.id === 'messages' && pendingMessages > 0) return { ...item, badge: pendingMessages };
    return item;
  });

  const pages = {
    dashboard:    <PageDashboard setPage={setPage}/>,
    clients:      <PageClients/>,
    messages:     <PageMessages/>,
    comptes:      <PageComptes/>,
    transactions: <PageTransactions/>,
    virement:     <PageVirement/>,
    retraits:     <PageRetraits/>,
    fonds:        <PageFondsAdmin/>,
    documents:    <PageDocuments/>,
    rapports:     <PageRapports/>,
    parametres:   <PageParametres/>,
  };

  return (
    <DashboardLayout title={title} subtitle={subtitle} navItems={navItemsWithBadge} activePage={page} onPageChange={setPage}
      logoSub="Administration" userLabel={adminName.slice(0,2).toUpperCase()} userRole={`Admin — ${adminName}`}>
      {pages[page]}
    </DashboardLayout>
  );
}
