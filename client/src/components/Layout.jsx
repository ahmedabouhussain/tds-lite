import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Menu, X, LogOut, Globe } from 'lucide-react';
import { t } from '../i18n';

const NAV = [
  { to: '/', key: 'dashboard', roles: null },
  { to: '/events', key: 'events', roles: null },
  { to: '/requests', key: 'requests', roles: null },
  { to: '/approvals', key: 'approvals', roles: ['Approver','Admin'] },
  { to: '/tickets', key: 'tickets', roles: ['Ticket Officer','Event Manager','Admin'] },
  { to: '/allocation', key: 'allocation', roles: ['Ticket Officer','Admin'] },
  { to: '/delivery', key: 'delivery', roles: ['Ticket Officer','Admin'] },
  { to: '/checkin', key: 'checkin', roles: ['Gate Scanner','Event Manager','Admin'] },
  { to: '/seating', key: 'seating', roles: null },
  { to: '/reports', key: 'reports', roles: null }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('tds_lang') || 'ar');
  const isRtl = lang === 'ar';

  const switchLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('tds_lang', next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
    setLang(next);
  };

  const visible = NAV.filter(n => !n.roles || n.roles.includes(user.role) || user.role === 'Admin');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 inset-x-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <span className="font-bold text-primary">TDS Lite</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={switchLang} className="flex items-center gap-1 text-sm px-2 py-1 border rounded">
            <Globe size={14} /> {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <span className="text-xs text-gray-600 hidden sm:inline">{user.name} ({user.role})</span>
          <button onClick={logout} className="p-2 text-red-600"><LogOut size={18} /></button>
        </div>
      </header>

      <aside className={`hidden md:block fixed top-14 bottom-0 w-60 bg-white border-gray-200 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} overflow-y-auto`}>
        <nav className="p-3 space-y-1">
          {visible.map(n => (
            <NavLink key={n.to} to={n.to} end
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
              {t(lang, n.key)}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)}></div>
          <aside className={`fixed top-0 bottom-0 w-64 bg-white z-50 md:hidden ${isRtl ? 'right-0' : 'left-0'}`}>
            <div className="h-14 border-b flex items-center justify-between px-4">
              <span className="font-bold text-primary">TDS Lite</span>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <nav className="p-3 space-y-1">
              {visible.map(n => (
                <NavLink key={n.to} to={n.to} end onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded text-sm ${isActive ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                  {t(lang, n.key)}
                </NavLink>
              ))}
            </nav>
          </aside>
        </>
      )}

      <main className={`pt-14 ${isRtl ? 'md:pr-60' : 'md:pl-60'} min-h-screen`}>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
