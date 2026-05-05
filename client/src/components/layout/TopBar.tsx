import { useAuth } from '../../hooks/useAuth';
import { LogOut, User } from 'lucide-react';

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-12 bg-surface-900 border-b border-surface-600 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
        <span className="text-xs text-gray-500">System Online</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <User className="w-4 h-4" />
          <span>{user?.displayName || user?.email}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-neon-red transition-colors"
        >
          <LogOut className="w-3 h-3" />
          Logout
        </button>
      </div>
    </header>
  );
}
