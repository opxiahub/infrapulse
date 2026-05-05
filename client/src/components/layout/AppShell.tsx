import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-950">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 min-w-0 overflow-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
