import { Link, Outlet } from 'react-router-dom';
import { APP_NAME } from '../lib/constants';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-10">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <Link to="/dashboard" className="text-base font-semibold text-slate-900">
            {APP_NAME}
          </Link>
          <span>Roommate-first tasks + expenses</span>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-sm">
            <Outlet />
          </section>
          <aside className="hidden flex-col justify-between gap-6 rounded-3xl border border-slate-200 bg-slate-900 p-8 text-slate-100 lg:flex">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Why DivvyDo</p>
              <h2 className="mt-4 text-2xl font-semibold">
                Keep chores and bills in sync without the awkward group chat.
              </h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-300">
              <li>Private personal tasks stay private.</li>
              <li>Household tasks and expenses share one ledger.</li>
              <li>Unclaimed roommates can join later.</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
