import { describe, it, expect } from 'vitest';
import { storePrefix } from './order-number.js';

describe('order-number', () => {
  it('derives a 3-letter prefix from the store name', () => {
    expect(storePrefix('SimplePOS Demo Store')).toBe('SDS');
    expect(storePrefix('Toko Maju')).toBe('TMX');
    expect(storePrefix('A')).toBe('AXX');
  });

  it('falls back to STR for empty/symbol-only names', () => {
    expect(storePrefix('!!!')).toBe('STR');
    expect(storePrefix('')).toBe('STR');
  });
});
