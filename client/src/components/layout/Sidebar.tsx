import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cloud, Activity, Box, X } from 'lucide-react';

interface Props {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: Props) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-3 md:py-2 rounded text-sm transition-all duration-200 ${
      isActive
        ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
        : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700 border border-transparent'
    }`;

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onMobileClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[82vw] bg-surface-900 border-r border-surface-600 flex flex-col transition-transform duration-200 md:static md:z-auto md:w-56 md:max-w-none md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="p-4 border-b border-surface-600">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-6 h-6 text-neon-green shrink-0" />
            <span className="text-lg font-bold text-neon-green tracking-wider truncate">INFRAPULSE</span>
          </div>
          <button
            onClick={onMobileClose}
            className="md:hidden h-9 w-9 rounded border border-surface-600 bg-surface-800 flex items-center justify-center text-gray-400"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 tracking-widest uppercase">
          Infrastructure Visualizer
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <NavLink to="/" className={linkClass} end onClick={onMobileClose}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>
        <NavLink to="/providers" className={linkClass} onClick={onMobileClose}>
          <Cloud className="w-4 h-4" />
          Providers
        </NavLink>
        <NavLink to="/kubernetes" className={linkClass} onClick={onMobileClose}>
          <Box className="w-4 h-4" />
          Kubernetes
        </NavLink>
      </nav>

      <div className="p-3 border-t border-surface-600">
        <div className="text-[10px] text-gray-600 text-center">
          v1.0.0 &middot; InfraPulse
        </div>
      </div>
    </aside>
    </>
  );
}
