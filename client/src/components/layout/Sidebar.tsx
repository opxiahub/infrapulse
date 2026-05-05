import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cloud, Activity, Box } from 'lucide-react';

export function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded text-sm transition-all duration-200 ${
      isActive
        ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
        : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700 border border-transparent'
    }`;

  return (
    <aside className="w-56 bg-surface-900 border-r border-surface-600 h-screen flex flex-col">
      <div className="p-4 border-b border-surface-600">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-neon-green" />
          <span className="text-lg font-bold text-neon-green tracking-wider">INFRAPULSE</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 tracking-widest uppercase">
          Infrastructure Visualizer
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <NavLink to="/" className={linkClass} end>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>
        <NavLink to="/providers" className={linkClass}>
          <Cloud className="w-4 h-4" />
          Providers
        </NavLink>
        <NavLink to="/kubernetes" className={linkClass}>
          <Box className="w-4 h-4" />
          Kubernetes
        </NavLink>
      </nav>

      <div className="p-3 border-t border-surface-600">
        <div className="text-[10px] text-gray-600 text-center">
          v1.0.0 &middot; Opxia
        </div>
      </div>
    </aside>
  );
}
