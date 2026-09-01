/**
 * Money helpers operating on integer cents to avoid floating-point drift.
 * DECIMAL(15,2) values arrive from postgres.js as strings; we parse, compute
 * in cents, and format back to 2-decimal strings.
 */
export function toCents(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid money value: ${value}`);
  return Math.round(n * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Multiply a price (string/number) by an integer quantity → cents. */
export function lineSubtotalCents(unitPrice: string | number, quantity: number): number {
  return toCents(unitPrice) * quantity;
}

/** Percentage of a cents amount, rounded to the nearest cent. */
export function percentOfCents(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}
