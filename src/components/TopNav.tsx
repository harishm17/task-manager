import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { APP_NAME } from '../lib/constants';
import { GroupSwitcher } from './GroupSwitcher';
import { GlobalSearchModal } from './search/GlobalSearchModal';
import { NotificationDropdown } from './notifications/NotificationDropdown';
import { ThemeToggle } from './common/ThemeToggle';
import { Avatar, Button } from './common/DesignSystem';

export function TopNav() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const email = user?.email ?? '';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K) and FAB events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    const handleFabSearch = () => {
      setIsSearchOpen(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('fab-search', handleFabSearch);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('fab-search', handleFabSearch);
    };
  }, [isSearchOpen]);

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-lg font-bold tracking-tight text-slate-800 hover:text-slate-900 transition-colors">
            {APP_NAME}
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <GroupSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-slate-500 sm:inline-flex"
            onClick={() => setIsSearchOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Search
            <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-slate-100 rounded">⌘K</kbd>
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 relative"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
            <NotificationDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>
          <ThemeToggle />
          <div className="pl-2">
            <Avatar name={email} size="md" className="ring-2 ring-white" />
          </div>
        </div>
      </div>

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
}
