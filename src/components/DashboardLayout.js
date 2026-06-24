import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = {
  app: { display:'flex', height:'100vh', overflow:'hidden' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:98, display:'none' },
  sidebar: { width:'var(--sidebar-w)', background:'var(--navy)', display:'flex', flexDirection:'column', flexShrink:0, transition:'transform 0.3s ease', zIndex:99 },
  sidebarMobileOpen: { position:'fixed', top:0, bottom:0, left:0, width:240, zIndex:99, transform:'translateX(0)' },
  sidebarMobileClosed: { position:'fixed', top:0, bottom:0, left:0, width:240, zIndex:99, transform:'translateX(-100%)' },
  logoArea: { padding:'18px 16px 14px', borderBottom:'1px solid rgba(201,168,76,0.2)' },
  logoBadge: { display:'flex', alignItems:'center', gap:10 },
  logoIcon: { width:34, height:34, background:'var(--gold)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--serif)', fontWeight:700, fontSize:14, color:'var(--navy)', flexShrink:0 },
  logoName: { fontFamily:'var(--serif)', fontSize:17, color:'#fff', letterSpacing:0.5 },
  logoSub: { fontSize:10, color:'rgba(201,168,76,0.5)', letterSpacing:0.5, marginTop:1 },
  nav: { flex:1, padding:'8px 0', overflowY:'auto' },
  navSection: { padding:'10px 16px 3px', fontSize:9, color:'rgba(201,168,76,0.4)', letterSpacing:1.5, textTransform:'uppercase' },
  navItem: { display:'flex', alignItems:'center', gap:9, padding:'8px 16px', fontSize:12, color:'rgba(255,255,255,0.5)', cursor:'pointer', borderLeft:'2px solid transparent', transition:'all 0.15s', userSelect:'none' },
  navItemActive: { background:'rgba(201,168,76,0.13)', color:'var(--gold-light)', borderLeftColor:'var(--gold)' },
  navBadge: { marginLeft:'auto', background:'#E24B4A', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:8 },
  sidebarFooter: { padding:'10px 16px', borderTop:'1px solid rgba(255,255,255,0.06)' },
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 },
  topbar: { background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 20px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  topbarTitle: { fontFamily:'var(--serif)', fontSize:18, color:'var(--navy)', fontWeight:600 },
  topbarSub: { fontSize:11, color:'var(--text2)' },
  topbarRight: { display:'flex', gap:7, alignItems:'center' },
  iconBtn: { width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text2)', fontSize:15, position:'relative', transition:'all 0.15s' },
  notifDot: { position:'absolute', top:6, right:6, width:5, height:5, background:'#E24B4A', borderRadius:'50%', border:'1.5px solid var(--bg2)' },
  content: { flex:1, overflowY:'auto', padding:'18px 20px' },
  menuBtn: { width:32, height:32, background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' },
};

export default function DashboardLayout({ title, subtitle, navItems, children, activePage, onPageChange, logoSub, userLabel, userRole, extraSidebarContent }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fn = () => { setIsMobile(window.innerWidth < 768); if (window.innerWidth >= 768) setSidebarOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebarStyle = isMobile
    ? { ...s.sidebar, ...(sidebarOpen ? s.sidebarMobileOpen : s.sidebarMobileClosed) }
    : { ...s.sidebar, position:'relative', transform:'none' };

  return (
    <div style={s.app}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div style={{ ...s.overlay, display:'block' }} onClick={() => setSidebarOpen(false)}/>
      )}

      <div style={sidebarStyle}>
        <div style={s.logoArea}>
          <div style={s.logoBadge}>
            {isMobile && <button style={s.menuBtn} onClick={() => setSidebarOpen(false)}><i className="ti ti-x"/></button>}
            <div style={s.logoIcon}>OJ</div>
            <div>
              <div style={s.logoName}>OJADA BANK</div>
              <div style={s.logoSub}>{logoSub}</div>
            </div>
          </div>
        </div>

        {extraSidebarContent}

        <nav style={s.nav}>
          {navItems.map((item, i) => (
            item.section
              ? <div key={i} style={s.navSection}>{item.section}</div>
              : <div key={item.id} style={{ ...s.navItem, ...(activePage===item.id ? s.navItemActive : {}) }}
                  onClick={() => { onPageChange(item.id); if(isMobile) setSidebarOpen(false); }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:16 }}/>
                  {item.label}
                  {item.badge && <span style={s.navBadge}>{item.badge}</span>}
                </div>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'var(--navy)', flexShrink:0 }}>{userLabel}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, color:'#fff', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userRole}</div>
            </div>
            <button onClick={handleLogout} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:15 }} title="Déconnexion">
              <i className="ti ti-logout"/>
            </button>
          </div>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.topbar}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {isMobile && (
              <button style={{ ...s.iconBtn, borderColor:'transparent' }} onClick={() => setSidebarOpen(true)}>
                <i className="ti ti-menu-2"/>
              </button>
            )}
            <div>
              <div style={s.topbarTitle}>{title}</div>
              <div style={s.topbarSub}>{subtitle}</div>
            </div>
          </div>
          <div style={s.topbarRight}>
            <button style={s.iconBtn}><i className="ti ti-bell"/><span style={s.notifDot}/></button>
            <button style={s.iconBtn}><i className="ti ti-user-circle"/></button>
          </div>
        </div>
        <div style={s.content}>{children}</div>
      </div>
    </div>
  );
}
