import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../lib/constants';
import { GroupSwitcher } from './GroupSwitcher';
import { Avatar, Button } from './common/DesignSystem';

export function TopNav() {
  const { user } = useAuth();
  const email = user?.email ?? '';

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
          >
            Search
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor" />
            </svg>
          </Button>
          <div className="pl-2">
            <Avatar name={email} size="md" className="ring-2 ring-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
