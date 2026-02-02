/**
 * Monitoring and Error Logging
 *
 * Centralized monitoring for errors, performance, and analytics.
 * Ready for integration with services like Sentry, LogRocket, etc.
 */

import { isProduction, isDevelopment, env } from '../config/env';

interface ErrorContext {
  user?: {
    id?: string;
    email?: string;
  };
  extra?: Record<string, any>;
  tags?: Record<string, string>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Initialize monitoring
 * Call this once at app startup
 */
export function initMonitoring(): void {
  if (!isProduction) {
    console.log('[Monitoring] Running in development mode - using console logging');
    return;
  }

  // In production, initialize error tracking service
  // Example with Sentry:
  // Sentry.init({
  //   dsn: 'your-sentry-dsn',
  //   environment: env.app.environment,
  //   release: env.app.version,
  //   tracesSampleRate: 0.1,
  // });

  // Set up global error handlers
  setupGlobalErrorHandlers();

  // Track Web Vitals
  trackWebVitals();

  console.log('[Monitoring] Initialized for production');
}

/**
 * Log an error with context
 */
export function logError(
  error: Error,
  context?: ErrorContext
): void {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    environment: env.app.environment,
    version: env.app.version,
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...context,
  };

  if (isProduction) {
    // Send to error tracking service
    // Example: Sentry.captureException(error, { contexts: context });

    // For now, send to console in structured format
    console.error('[Error]', errorInfo);

    // Could also send to your own logging endpoint
    sendToLoggingEndpoint('error', errorInfo);
  } else {
    // Development: show in console with full details
    console.error('[Error]', error);
    if (context) {
      console.error('[Error Context]', context);
    }
  }
}

/**
 * Log a warning
 */
export function logWarning(
  message: string,
  context?: Record<string, any>
): void {
  const warningInfo = {
    message,
    timestamp: new Date().toISOString(),
    environment: env.app.environment,
    url: window.location.href,
    ...context,
  };

  if (isProduction) {
    console.warn('[Warning]', warningInfo);
    sendToLoggingEndpoint('warning', warningInfo);
  } else {
    console.warn('[Warning]', message, context);
  }
}

/**
 * Log an info message
 */
export function logInfo(
  message: string,
  context?: Record<string, any>
): void {
  if (isDevelopment) {
    console.log('[Info]', message, context);
  }

  // In production, only log important events
  if (isProduction && context?.important) {
    sendToLoggingEndpoint('info', { message, ...context });
  }
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
): void {
  const eventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    properties,
    url: window.location.href,
  };

  if (isDevelopment) {
    console.log('[Event]', eventName, properties);
  }

  if (isProduction) {
    // Send to analytics service
    // Example: analytics.track(eventName, properties);
    sendToLoggingEndpoint('event', eventData);
  }
}

/**
 * Track a performance metric
 */
export function trackPerformance(metric: PerformanceMetric): void {
  if (isDevelopment) {
    console.log('[Performance]', metric);
  }

  if (isProduction) {
    sendToLoggingEndpoint('performance', metric);
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string }): void {
  if (isProduction) {
    // Example: Sentry.setUser(user);
    console.log('[Monitoring] User set:', user.id);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
  if (isProduction) {
    // Example: Sentry.setUser(null);
    console.log('[Monitoring] User cleared');
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level?: 'debug' | 'info' | 'warning' | 'error'
): void {
  if (isDevelopment) {
    console.log(`[Breadcrumb] ${category || 'default'}: ${message}`);
  }

  // In production, breadcrumbs help reconstruct user actions before an error
  // Example: Sentry.addBreadcrumb({ message, category, level });
}

/**
 * Setup global error handlers
 */
function setupGlobalErrorHandlers(): void {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      {
        tags: { type: 'unhandled-rejection' },
        extra: { reason: event.reason },
      }
    );
  });

  // Catch global errors
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), {
      tags: { type: 'global-error' },
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}

/**
 * Track Web Vitals (Core Web Vitals)
 */
function trackWebVitals(): void {
  // Use web-vitals library if available
  // import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

  try {
    // For now, use Performance Observer API
    if ('PerformanceObserver' in window) {
      // Track Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        trackPerformance({
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          rating: lastEntry.renderTime < 2500 ? 'good' : 'needs-improvement',
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          trackPerformance({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: entry.processingStart - entry.startTime < 100 ? 'good' : 'needs-improvement',
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Track Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Report CLS when page is about to be unloaded
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          trackPerformance({
            name: 'CLS',
            value: clsValue,
            rating: clsValue < 0.1 ? 'good' : 'needs-improvement',
          });
        }
      });
    }
  } catch (error) {
    console.warn('[Monitoring] Could not set up Web Vitals tracking:', error);
  }
}

/**
 * Send logs to backend endpoint
 */
async function sendToLoggingEndpoint(
  level: string,
  data: any
): Promise<void> {
  try {
    // In a real implementation, send to your logging backend
    // await fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ level, data }),
    // });

    // For now, just queue it (could use a service like Logtail, Papertrail, etc.)
    if (isDevelopment) {
      console.log('[Would send to logging endpoint]', level, data);
    }
  } catch (error) {
    // Don't let logging errors break the app
    console.error('[Monitoring] Failed to send log:', error);
  }
}
