import { useAuth } from '../../hooks/useAuth';
import { LogOut, Menu, User } from 'lucide-react';

interface Props {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: Props) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 sm:h-12 bg-surface-900 border-b border-surface-600 flex items-center justify-between gap-3 px-3 sm:px-4 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="md:hidden h-10 w-10 rounded border border-surface-600 bg-surface-800 flex items-center justify-center text-gray-300"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
        <span className="hidden sm:inline text-xs text-gray-500">System Online</span>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 text-sm text-gray-300 min-w-0">
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[46vw] sm:max-w-xs">{user?.displayName || user?.email}</span>
        </div>
        <button
          onClick={logout}
          className="h-10 sm:h-auto px-2 sm:px-0 flex items-center gap-1 text-xs text-gray-500 hover:text-neon-red transition-colors shrink-0"
        >
          <LogOut className="w-3 h-3" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
