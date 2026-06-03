import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const IcDash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IcInvoice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);
const IcCustomers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IcProducts = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IcReports = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IcSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93A10 10 0 115.93 19.07M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);
const IcLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/>
  </svg>
);
const IcClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const LogoAtom = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity="0.2" fill="currentColor" stroke="none"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(0 12 12)"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/>
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/>
  </svg>
);

const NAV = [
  { path: '/', label: 'Dashboard', Icon: IcDash, exact: true },
  { path: '/invoices/create', label: 'New Invoice', Icon: IcInvoice },
  { path: '/customers', label: 'Customers', Icon: IcCustomers },
  { path: '/products', label: 'Products', Icon: IcProducts },
  { path: '/reports', label: 'Reports', Icon: IcReports },
  { path: '/settings', label: 'Settings', Icon: IcSettings },
];

export default function Layout({ children, title, actions }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const isActive = ({ path, exact }) =>
    exact ? location.pathname === path : location.pathname.startsWith(path) && path !== '/';

  const handleLogout = () => {
    ['accessToken', 'refreshToken', 'user'].forEach(k => localStorage.removeItem(k));
    navigate('/login');
  };

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';

  const goTo = (path) => { navigate(path); setOpen(false); };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-neutral-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <LogoAtom />
          </div>
          <div>
            <div className="sidebar-logo-title">ChemInvoice</div>
            <div className="sidebar-logo-sub">FBR Pro · Pakistan</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Menu</span>
          {NAV.map(({ path, label, Icon, exact }) => (
            <button
              key={path}
              onClick={() => goTo(path)}
              className={`sidebar-item ${isActive({ path, exact }) ? 'active' : ''}`}
            >
              <span className="sidebar-icon"><Icon /></span>
              <span>{label}</span>
              {label === 'New Invoice' && (
                <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-accent text-primary text-xs font-bold">+</span>
              )}
            </button>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="sidebar-avatar">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate leading-none mb-0.5">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Logout
              </div>
            </div>
            <span className="sidebar-icon" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <IcLogout />
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <button
          onClick={() => setOpen(true)}
          className="btn btn-ghost btn-icon text-neutral-600"
          aria-label="Open menu"
        >
          <span className="w-5 h-5"><IcMenu /></span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-accent">
            <span className="w-4 h-4"><LogoAtom /></span>
          </div>
          <span className="font-display font-bold text-neutral-800 text-base">ChemInvoice</span>
        </div>
        <div className="ml-auto">
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </header>

      {/* Main content */}
      <div className="main-content mobile-pt">
        {/* Desktop page header */}
        {title && (
          <div className="page-header hidden lg:flex">
            <h1 className="page-title">{title}</h1>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        )}

        {/* Mobile page header (below topbar) */}
        {title && (
          <div className="lg:hidden px-4 pt-4 pb-2 flex items-center justify-between">
            <h1 className="font-display font-bold text-neutral-800 text-lg">{title}</h1>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        )}

        <div className="page-body">
          {children}
        </div>
      </div>
    </>
  );
}
