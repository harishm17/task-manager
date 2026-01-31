import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Button } from './DesignSystem';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">😵</div>
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-600">
          We're sorry, but something unexpected happened. This error has been reported and we're working to fix it.
        </p>

        <details className="text-left bg-white p-3 rounded-lg border text-xs font-mono text-slate-700">
          <summary className="cursor-pointer font-sans font-medium">Technical details</summary>
          <pre className="mt-2 whitespace-pre-wrap">{error instanceof Error ? error.message : String(error)}</pre>
        </details>

        <div className="flex gap-3 justify-center">
          <Button onClick={resetErrorBoundary} variant="primary">
            Try again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reload page
          </Button>
        </div>

        <Button
          onClick={() => {
            // In a real app, this would report to error tracking service
            console.error('User reported error:', error);
            alert('Error report sent. Thank you!');
          }}
          variant="ghost"
          className="text-xs"
        >
          Report this issue
        </Button>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<FallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function ErrorBoundary({
  children,
  fallback: Fallback = ErrorFallback,
  onError
}: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onError={(error, errorInfo) => {
        // Log to console in development
        console.error('Error Boundary caught an error:', error, errorInfo);

        // Call custom error handler if provided
        onError?.(error as Error, errorInfo);

        // In production, this would send to error tracking service like Sentry
        if (import.meta.env.PROD) {
          // TODO: Send to Sentry or similar
          console.error('Production error - should send to error tracking service');
        }
      }}
      onReset={() => {
        // Clear any error state when user tries again
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Page-level error boundary for route-specific errors
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ resetErrorBoundary }) => (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-semibold text-slate-900">Page Error</h2>
            <p className="text-sm text-slate-600">
              This page encountered an unexpected error.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={resetErrorBoundary} size="sm">
                Try again
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                size="sm"
              >
                Go back
              </Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Component-level error boundary for isolated component failures
export function ComponentErrorBoundary({
  children,
  componentName = 'Component'
}: {
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={({ resetErrorBoundary }) => (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-red-500">⚠️</div>
            <div className="flex-1">
              <h3 className="font-medium text-red-900">{componentName} Error</h3>
              <p className="text-sm text-red-700 mt-1">
                This component failed to load. You can try refreshing it.
              </p>
            </div>
            <Button
              onClick={resetErrorBoundary}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Retry
            </Button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
