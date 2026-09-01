/**
 * Report window math (UTC, mirrors the backend's periodRange). Extracted from
 * the reports page so the logic is unit-testable.
 */

export type ReportWindowPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function windowOf(
  period: ReportWindowPeriod,
  anchorStr: string,
): { start: Date; end: Date } {
  const anchor = new Date(`${anchorStr}T00:00:00Z`);
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const d = anchor.getUTCDate();
  if (period === 'daily') {
    return { start: new Date(Date.UTC(y, m, d)), end: new Date(Date.UTC(y, m, d + 1)) };
  }
  if (period === 'weekly') {
    const dow = (anchor.getUTCDay() + 6) % 7; // Monday = 0
    return {
      start: new Date(Date.UTC(y, m, d - dow)),
      end: new Date(Date.UTC(y, m, d - dow + 7)),
    };
  }
  if (period === 'yearly') {
    return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)) };
  }
  return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1)) };
}

/** Normalize the anchor so prev/next stepping never skips windows. */
export function normalizeAnchor(period: ReportWindowPeriod, anchorStr: string): string {
  const a = new Date(`${anchorStr}T00:00:00Z`);
  if (period === 'monthly') a.setUTCDate(1);
  if (period === 'yearly') {
    a.setUTCMonth(0, 1);
  }
  return toISODate(a);
}

export function stepAnchor(period: ReportWindowPeriod, anchorStr: string, dir: 1 | -1): string {
  const a = new Date(`${normalizeAnchor(period, anchorStr)}T00:00:00Z`);
  if (period === 'daily') a.setUTCDate(a.getUTCDate() + dir);
  else if (period === 'weekly') a.setUTCDate(a.getUTCDate() + 7 * dir);
  else if (period === 'yearly') a.setUTCFullYear(a.getUTCFullYear() + dir);
  else a.setUTCMonth(a.getUTCMonth() + dir);
  return toISODate(a);
}

// ---- Indonesian labels ----

const fmtDay = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const fmtDayShort = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtDayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmtMonth = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function windowLabel(period: ReportWindowPeriod, anchorStr: string): string {
  const { start, end } = windowOf(period, anchorStr);
  if (period === 'daily') return fmtDay.format(start);
  if (period === 'weekly') {
    const last = new Date(end.getTime() - 1);
    return `${fmtDayMonth.format(start)} – ${fmtDayMonth.format(last)} ${last.getUTCFullYear()}`;
  }
  if (period === 'yearly') return String(start.getUTCFullYear());
  return fmtMonth.format(start);
}

export function rangeLabel(period: ReportWindowPeriod, anchorStr: string): string {
  const { start, end } = windowOf(period, anchorStr);
  const last = new Date(end.getTime() - 1);
  if (period === 'yearly') return `1 Jan – 31 Des ${start.getUTCFullYear()}`;
  if (period === 'monthly') return `1 – ${fmtDayMonth.format(last)} ${last.getUTCFullYear()}`;
  return `${fmtDayShort.format(start)} – ${fmtDayShort.format(last)}`;
}

/** Short bucket label for trend charts (one per data point). */
export function trendBucketLabel(period: ReportWindowPeriod, bucketIso: string): string {
  const d = new Date(bucketIso);
  if (period === 'daily') {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
  }
  if (period === 'weekly') {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
  }
  if (period === 'yearly') return String(d.getUTCFullYear());
  return new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' }).format(d);
}
