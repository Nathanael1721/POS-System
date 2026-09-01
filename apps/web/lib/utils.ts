import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a numeric/string amount as currency (default IDR). */
export function formatCurrency(value: string | number, currency = 'IDR'): string {
  const n = typeof value === 'number' ? value : Number(value);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Resolve a product image_url for display. External URLs are used as-is;
 * relative paths (uploaded images served by the API, e.g. /media/...) are
 * prefixed with the API base URL.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Keep only digits from a raw input string. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Format a digit string with Indonesian thousand separators ("." divider). */
export function formatThousands(digits: string): string {
  const clean = digitsOnly(digits).replace(/^0+(?=\d)/, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Suggest quick-cash amounts >= total: an exact "uang pas" plus the nearest
 * round-up denominations (5k / 10k / 20k / 50k / 100k) and standard notes.
 * Returns ascending unique values, capped to keep the UI tidy.
 */
export function quickCashSuggestions(total: number): number[] {
  if (total <= 0) return [];
  const steps = [5_000, 10_000, 20_000, 50_000, 100_000];
  const notes = [5_000, 10_000, 20_000, 50_000, 100_000];
  const set = new Set<number>();
  for (const step of steps) set.add(Math.ceil(total / step) * step);
  for (const note of notes) if (note >= total) set.add(note);
  return Array.from(set)
    .filter((v) => v >= total)
    .sort((a, b) => a - b)
    .slice(0, 4);
}
