import { describe, expect, it } from 'vitest';
import { claimNumberMatches, formatClaimNumber, validClaimEmail, validClaimPhone } from './claimNumber';
describe('claimnummer', () => {
  it('formatteert jaar en vier cijfers', () => { expect(formatClaimNumber(2026,42)).toBe('GC-2026-0042'); expect(formatClaimNumber(2025,51)).toBe('GC-2025-0051'); });
  it('houdt volgorde', () => { expect(formatClaimNumber(2026,183) < formatClaimNumber(2026,184)).toBe(true); expect(() => formatClaimNumber(2026,10000)).toThrow(); });
  it('zoekt met GC, zonder GC en ongeacht hoofdletters', () => { expect(claimNumberMatches('GC-2026-0042','gc-2026-0042')).toBe(true); expect(claimNumberMatches('GC-2026-0042','2026-0042')).toBe(true); expect(claimNumberMatches('GC-2026-0042','2026-0043')).toBe(false); });
});
describe('claimcontact validatie', () => {
  it('accepteert Nederlandse mobiele en vaste nummers met spaties', () => { expect(validClaimPhone('06 1234 5678')).toBe(true); expect(validClaimPhone('+31 6 1234 5678')).toBe(true); expect(validClaimPhone('010 262 3980')).toBe(true); expect(validClaimPhone('06123')).toBe(false); expect(validClaimPhone('+44 123456789')).toBe(false); });
  it('controleert email', () => { expect(validClaimEmail('test@example.invalid')).toBe(true); expect(validClaimEmail('test@')).toBe(false); expect(validClaimEmail('a b@example.invalid')).toBe(false); });
});