// Deterministic script-style salesperson signature.
// Keep in sync with the same routine in supabase/functions/contract-create/index.ts
// so the preview in the CRM matches the snapshot stored on the contract.
export function buildSalespersonSignatureSvg(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const safeName = fullName.replace(/[<>&]/g, "");
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 80' width='240' height='60'><g fill='none' stroke='#FF6B00' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='M8 62 C 28 22, 58 22, 78 58 S 118 74, 138 34 S 178 20, 198 60 S 238 72, 258 30 S 298 24, 314 58'/></g><text x='160' y='22' text-anchor='middle' font-family='Space Grotesk, sans-serif' font-size='12' fill='#ffffff' opacity='0.9'>${safeName}</text></svg>`;
}