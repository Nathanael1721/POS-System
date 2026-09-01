import { describe, expect, it } from 'vitest';
import { formatCurrency, digitsOnly, formatThousands, quickCashSuggestions } from './utils';

describe('formatCurrency', () => {
  // Intl id-ID separates "Rp" and the amount with a non-breaking space —
  // normalize it so assertions stay readable.
  const fmt = (v: string | number) => formatCurrency(v).replace(/\u00A0/g, ' ');

  it('formats IDR without decimals using id-ID conventions', () => {
    expect(fmt(15000)).toBe('Rp 15.000');
    expect(fmt('23976')).toBe('Rp 23.976');
  });

  it('formats zero and non-finite safely', () => {
    expect(fmt(0)).toBe('Rp 0');
    expect(fmt('bukan-angka')).toBe('Rp 0');
  });
});

describe('digitsOnly', () => {
  it('strips every non-digit character', () => {
    expect(digitsOnly('Rp 1.234.567')).toBe('1234567');
    expect(digitsOnly('12-34 abc')).toBe('1234');
  });
});

describe('formatThousands', () => {
  it('groups digits with Indonesian dots', () => {
    expect(formatThousands('1234567')).toBe('1.234.567');
  });

  it('trims leading zeros and returns empty for no digits', () => {
    expect(formatThousands('00120')).toBe('120');
    expect(formatThousands('')).toBe('');
    expect(formatThousands('abc')).toBe('');
  });
});

describe('quickCashSuggestions', () => {
  it('always suggests at least the exact round-up above the total', () => {
    const s = quickCashSuggestions(12345);
    expect(s.length).toBeGreaterThan(0);
    for (const v of s) expect(v).toBeGreaterThanOrEqual(12345);
  });

  it('caps the suggestion list to keep the UI tidy', () => {
    expect(quickCashSuggestions(999).length).toBeLessThanOrEqual(4);
  });

  it('returns nothing for zero totals', () => {
    expect(quickCashSuggestions(0)).toEqual([]);
  });
});
