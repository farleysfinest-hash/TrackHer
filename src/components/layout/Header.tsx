import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { LogoMark } from '../ui/LogoMark';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';
import { useProfileAvatarUrl } from '../../hooks/useProfileAvatarUrl';

export function Header() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const avatarText = profile?.display_name
    ? getInitials(profile.display_name)
    : profile
      ? (user?.email?.trim()?.charAt(0)?.toUpperCase() ?? '?')
      : null;
  const avatarUrl = useProfileAvatarUrl();

  return (
    <header className="safe-area-top safe-area-header-x sticky top-0 z-40 flex min-w-0 items-center justify-between gap-3 border-b border-sand-200 bg-sand-50/95 pb-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden md:hidden">
        <Logo size="sm" className="truncate" />
        <LogoMark size={36} className="h-9 w-9 shrink-0" />
      </div>
      <div className="hidden md:block" />

      <div className="relative z-50 shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sage-50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sage-500 text-sm font-medium text-on-accent">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              avatarText ?? ' '
            )}
          </div>
          <span className="hidden text-sm font-medium text-sage-700 sm:inline">
            {profile?.display_name ?? user?.email ?? 'User'}
          </span>
          <ChevronDown className="h-4 w-4 text-sage-400" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-sand-200 bg-sand-50 py-1 shadow-lg"
          >
            <Link
              role="menuitem"
              to="/settings"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-sage-700 hover:bg-sage-50"
              onClick={() => setMenuOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              role="menuitem"
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
