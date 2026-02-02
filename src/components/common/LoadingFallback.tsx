/**
 * Loading Fallback Component
 * Displays a consistent loading UI for lazy-loaded routes
 */

export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-slate-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}
