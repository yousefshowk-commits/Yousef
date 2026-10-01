import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Sidebar, SidebarContent } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ms-[17.5rem] print:ms-0">
        <Topbar onMenu={() => setDrawer(true)} />
        <main key={pathname} className="animate-slide-up print-full mx-auto max-w-7xl px-3 pb-28 pt-5 sm:px-5 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <MobileNav onMore={() => setDrawer(true)} />
      {drawer &&
        createPortal(
          <div className="fixed inset-0 z-[70] lg:hidden">
            <div className="animate-fade-in absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <div className="animate-slide-up absolute inset-y-0 start-0 w-[85%] max-w-xs bg-white shadow-2xl dark:bg-slate-900">
              <button className="absolute left-3 top-3 z-10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setDrawer(false)} aria-label="إغلاق">
                <X />
              </button>
              <div className="h-full pt-12">
                <SidebarContent onNavigate={() => setDrawer(false)} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
