import { NavLink, Outlet } from 'react-router-dom';
import { SideNav } from '../components/SideNav';
import { TopNav } from '../components/TopNav';

const mobileItems = [
  { to: '/dashboard', label: 'Home' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/expenses', label: 'Spend' },
  { to: '/balances', label: 'Owe' },
  { to: '/settings', label: 'Settings' },
];

export function AppLayout() {
  return (
    <div className="min-h-screen text-ink">
      <TopNav />
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <SideNav />
        </aside>
        <main className="flex-1 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
          <Outlet />
        </main>
      </div>
      <nav className="fixed bottom-4 left-1/2 z-20 flex w-[90%] max-w-md -translate-x-1/2 justify-between gap-1 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-lg backdrop-blur md:hidden">
        {mobileItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex flex-1 items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold transition',
                isActive ? 'bg-slate-900 text-white' : 'text-slate-500',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
