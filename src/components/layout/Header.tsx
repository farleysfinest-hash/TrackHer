import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';
import logoMark from '../../assets/logo-mark.png';

export function Header() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const emailInitial =
    user?.email?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  const avatarText = profile?.display_name
    ? getInitials(profile.display_name)
    : emailInitial;

  return (
    <header className="safe-area-top sticky top-0 z-20 flex items-center justify-between border-b border-sand-200 bg-white/95 px-6 pb-4 backdrop-blur-sm md:px-8">
      <div className="flex items-center gap-2 md:hidden">
        <Logo size="sm" />
        <img
          src={logoMark}
          alt=""
          width={36}
          height={36}
          className="block h-9 w-9 shrink-0 object-contain"
        />
      </div>
      <div className="hidden md:block" />

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sage-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-500 text-sm font-medium text-white">
            {avatarText}
          </div>
          <span className="hidden text-sm font-medium text-sage-700 sm:inline">
            {profile?.display_name ?? user?.email ?? 'User'}
          </span>
          <ChevronDown className="h-4 w-4 text-sage-400" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-sand-200 bg-white py-1 shadow-lg">
            <Link
              to="/settings"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-sage-700 hover:bg-sage-50"
              onClick={() => setMenuOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-sage-700 hover:bg-sage-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
