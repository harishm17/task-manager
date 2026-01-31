import { useMemo } from 'react';

/**
 * Shared currency formatter instances cached by currency code
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Get or create a currency formatter for the specified currency
 */
export function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  if (!formatterCache.has(currency)) {
    formatterCache.set(
      currency,
      new Intl.NumberFormat('en-US', { style: 'currency', currency })
    );
  }
  return formatterCache.get(currency)!;
}

/**
 * Hook to get a memoized currency formatter
 */
export function useCurrencyFormatter(currency: string): Intl.NumberFormat {
  return useMemo(() => getCurrencyFormatter(currency), [currency]);
}

/**
 * Format an amount in cents to currency string
 */
export function formatCurrency(amountCents: number, currency: string): string {
  const formatter = getCurrencyFormatter(currency);
  return formatter.format(amountCents / 100);
}

/**
 * Format a date to a localized string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a date to relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (Math.abs(diffDays) >= 1) {
    return diffDays > 0 ? `in ${diffDays} day${diffDays !== 1 ? 's' : ''}` : `${Math.abs(diffDays)} day${diffDays !== -1 ? 's' : ''} ago`;
  }
  if (Math.abs(diffHours) >= 1) {
    return diffHours > 0 ? `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}` : `${Math.abs(diffHours)} hour${diffHours !== -1 ? 's' : ''} ago`;
  }
  if (Math.abs(diffMinutes) >= 1) {
    return diffMinutes > 0 ? `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}` : `${Math.abs(diffMinutes)} minute${diffMinutes !== -1 ? 's' : ''} ago`;
  }
  return 'just now';
}
