import { describe, it, expect } from 'vitest';
import { toCents, fromCents, lineSubtotalCents, percentOfCents } from './money.js';

describe('money utils', () => {
  it('converts to and from cents without drift', () => {
    expect(toCents('4000.00')).toBe(400000);
    expect(toCents(6500)).toBe(650000);
    expect(fromCents(400000)).toBe('4000.00');
    expect(fromCents(0)).toBe('0.00');
  });

  it('computes line subtotals', () => {
    expect(lineSubtotalCents('12000.00', 3)).toBe(3600000);
    expect(fromCents(lineSubtotalCents('3500.00', 10))).toBe('35000.00');
  });

  it('computes rounded percentages', () => {
    expect(percentOfCents(10000, 10)).toBe(1000); // 10% of 100.00 = 10.00
    expect(percentOfCents(333, 10)).toBe(33); // rounds 33.3 -> 33
  });

  it('rejects invalid money values', () => {
    expect(() => toCents('not-a-number')).toThrow();
  });
});
