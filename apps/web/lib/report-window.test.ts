import { describe, expect, it } from 'vitest';
import {
  toISODate,
  windowOf,
  normalizeAnchor,
  stepAnchor,
} from './report-window';

describe('windowOf (UTC, mirrors backend)', () => {
  it('daily window spans a single day', () => {
    const { start, end } = windowOf('daily', '2026-08-15');
    expect(start.toISOString()).toBe('2026-08-15T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-16T00:00:00.000Z');
  });

  it('weekly window starts Monday (2026-08-15 is a Saturday)', () => {
    const { start, end } = windowOf('weekly', '2026-08-15');
    expect(start.toISOString()).toBe('2026-08-10T00:00:00.000Z'); // Monday
    expect(end.toISOString()).toBe('2026-08-17T00:00:00.000Z');
  });

  it('monthly window covers the whole anchor month', () => {
    const { start, end } = windowOf('monthly', '2026-02-10');
    expect(start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('yearly window covers the whole anchor year (leap year)', () => {
    const { start, end } = windowOf('yearly', '2024-07-01');
    expect(start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });
});

describe('normalizeAnchor', () => {
  it('monthly pins the anchor to day 1', () => {
    expect(normalizeAnchor('monthly', '2026-08-23')).toBe('2026-08-01');
  });

  it('yearly pins the anchor to Jan 1', () => {
    expect(normalizeAnchor('yearly', '2026-08-23')).toBe('2026-01-01');
  });

  it('daily and weekly keep the anchor date', () => {
    expect(normalizeAnchor('daily', '2026-08-23')).toBe('2026-08-23');
    expect(normalizeAnchor('weekly', '2026-08-23')).toBe('2026-08-23');
  });
});

describe('stepAnchor', () => {
  it('steps one day at a time', () => {
    expect(stepAnchor('daily', '2026-08-31', 1)).toBe('2026-09-01');
    expect(stepAnchor('daily', '2026-09-01', -1)).toBe('2026-08-31');
  });

  it('steps weeks by 7 days', () => {
    expect(stepAnchor('weekly', '2026-08-15', -1)).toBe('2026-08-08');
  });

  it('rolls over month ends (Aug 31 → Sep 30 is wrong; must be Oct 1 via normalization)', () => {
    // Anchor is normalized to day 1 first, so stepping from any August date lands on Aug 1
    expect(stepAnchor('monthly', '2026-08-31', 1)).toBe('2026-09-01');
    expect(stepAnchor('monthly', '2026-12-15', 1)).toBe('2027-01-01');
  });

  it('steps years across leap years', () => {
    expect(stepAnchor('yearly', '2024-05-05', 1)).toBe('2025-01-01');
    expect(stepAnchor('yearly', '2025-01-01', -1)).toBe('2024-01-01');
  });
});

describe('toISODate', () => {
  it('formats a UTC date as YYYY-MM-DD', () => {
    expect(toISODate(new Date('2026-08-15T23:59:59Z'))).toBe('2026-08-15');
  });
});
