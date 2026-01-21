export function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-mint" />
        Loading...
      </div>
    </div>
  );
}
