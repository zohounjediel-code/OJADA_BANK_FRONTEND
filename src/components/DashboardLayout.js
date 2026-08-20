import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import logo from '../assets/logo.png';

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

  return (
    <div className="flex h-screen overflow-hidden">
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-[98] bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={[
          'z-[99] flex w-60 shrink-0 flex-col bg-navy transition-transform duration-300 ease-in-out md:relative md:w-[220px] md:translate-x-0',
          isMobile ? 'fixed inset-y-0 left-0' : 'relative',
          isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0',
        ].join(' ')}
      >
        <div className="border-b border-gold/20 px-4 pb-3.5 pt-[18px]">
          <div className="flex items-center gap-2.5">
            {isMobile && (
              <button className="flex h-8 w-8 items-center justify-center text-lg text-white/70" onClick={() => setSidebarOpen(false)}>
                <i className="ti ti-x" />
              </button>
            )}
            <img src={logo} alt="OjadaBank" className="h-[34px] w-[34px] shrink-0 rounded-full object-cover ring-[1.5px] ring-gold/50" />
            <div className="min-w-0">
              <div className="truncate font-serif text-[17px] tracking-wide text-white">OJADA BANK</div>
              <div className="truncate text-[10px] tracking-wide text-gold/50">{logoSub}</div>
            </div>
          </div>
        </div>

        {extraSidebarContent}

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item, i) => (
            item.section
              ? <div key={i} className="px-4 pb-1 pt-2.5 text-[9px] uppercase tracking-wider text-gold/40">{item.section}</div>
              : (
                <div
                  key={item.id}
                  onClick={() => { onPageChange(item.id); if (isMobile) setSidebarOpen(false); }}
                  className={[
                    'flex cursor-pointer select-none items-center gap-2.5 border-l-2 px-4 py-2 text-xs transition-colors',
                    activePage === item.id
                      ? 'border-gold bg-gold/[0.13] text-gold-light'
                      : 'border-transparent text-white/50 hover:bg-white/5 hover:text-white/70',
                  ].join(' ')}
                >
                  <i className={`ti ${item.icon} text-base`} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-[#E24B4A] px-1.5 py-0.5 text-[9px] font-bold text-white">{item.badge}</span>
                  )}
                </div>
              )
          ))}
        </nav>

        <div className="border-t border-white/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-navy">{userLabel}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-white">{userRole}</div>
            </div>
            <button onClick={handleLogout} className="text-white/30 transition-colors hover:text-white/60" title="Déconnexion">
              <i className="ti ti-logout text-[15px]" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-[54px] shrink-0 items-center justify-between border-b border-navy/10 bg-white px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {isMobile && (
              <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B]" onClick={() => setSidebarOpen(true)}>
                <i className="ti ti-menu-2" />
              </button>
            )}
            <div className="min-w-0">
              <div className="truncate font-serif text-lg font-semibold text-navy">{title}</div>
              <div className="truncate text-[11px] text-[#64748B]">{subtitle}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-[7px]">
            <LanguageSwitcher />
            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-navy/10 text-[15px] text-[#64748B] transition-colors hover:bg-navy/5">
              <i className="ti ti-bell" />
              <span className="absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full bg-[#E24B4A] ring-[1.5px] ring-white" />
            </button>
            <button className="hidden h-8 w-8 items-center justify-center rounded-lg border border-navy/10 text-[15px] text-[#64748B] transition-colors hover:bg-navy/5 sm:flex">
              <i className="ti ti-user-circle" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-[18px]">{children}</div>
      </div>
    </div>
  );
}
