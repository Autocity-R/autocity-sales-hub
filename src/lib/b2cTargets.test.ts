import { describe, it, expect } from 'vitest';
import { B2C_TARGET_DEFAULTS, b2cMarginIncludingWarranty } from './b2cTargets';

describe('B2C team targets', () => {
  it('requires 50 B2C sales', () => {
    expect(B2C_TARGET_DEFAULTS.b2c_units).toBe(50);
  });
  it('requires 200000 euros of total margin', () => {
    expect(B2C_TARGET_DEFAULTS.b2c_revenue).toBe(200000);
  });
  it('adds a 995 euro warranty package exactly once to the vehicle margin', () => {
    expect(b2cMarginIncludingWarranty(30000 - 26000, 995)).toBe(4995);
  });
  it('keeps the other targets unchanged', () => {
    expect(B2C_TARGET_DEFAULTS.b2c_margin_percent).toBe(15);
    expect(B2C_TARGET_DEFAULTS.upsales_revenue).toBe(5000);
  });
});