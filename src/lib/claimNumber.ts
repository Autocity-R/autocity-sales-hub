export const claimNumberMatches = (number: string | null | undefined, query: string) =>
  (number || '').toUpperCase().replace(/^GC-/, '').includes(query.trim().toUpperCase().replace(/^GC-/, ''));

export function formatClaimNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) throw new Error('Ongeldig volgnummer');
  return `GC-${year}-${String(sequence).padStart(4, '0')}`;
}
export const validClaimPhone = (value: string) => !value.trim() || /^(0[1-9]\d{8}|\+31[1-9]\d{8})$/.test(value.replace(/[ ()-]/g, ''));
export const validClaimEmail = (value: string) => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());