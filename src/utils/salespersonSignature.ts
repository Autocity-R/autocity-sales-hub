// Deterministic elegant script-style salesperson signature — LMS look.
// A cursive rendering of the salesperson's initials with a flourish, and the
// full name discreetly below. Keep in sync with the same routine in
// supabase/functions/contract-create/index.ts.
export function buildSalespersonSignatureSvg(
  fullName: string | null | undefined,
): string | null {
  if (!fullName) return null;
  const safeName = fullName.replace(/[<>&"']/g, "").trim();
  if (!safeName) return null;
  const initials =
    safeName
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .join("")
      .slice(0, 3)
      .toUpperCase() || safeName[0].toUpperCase();

  // Deterministic tiny wobble derived from the name so different verkopers get
  // subtly different flourishes (same name = same signature).
  let seed = 0;
  for (let i = 0; i < safeName.length; i++) seed = (seed * 31 + safeName.charCodeAt(i)) & 0xffff;
  const s = (n: number, range: number) => ((seed >> n) & 0x1f) / 31 * range - range / 2;

  const tilt = -5 + s(0, 3); // slight left-lean
  const flourishY = 78 + s(3, 4);
  const swoopY = 90 + s(6, 4);

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 340 110' width='260' height='84'>
    <defs>
      <style>@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&amp;family=Dancing+Script:wght@600;700&amp;family=Inter:wght@400;500&amp;display=swap');</style>
    </defs>
    <g transform='translate(24,${72 + s(9, 3)}) rotate(${tilt.toFixed(2)})'>
      <text x='0' y='0' font-family='Great Vibes, Dancing Script, cursive' font-size='72' fill='#ffffff' font-weight='400'>${initials}</text>
    </g>
    <path d='M 14 ${flourishY.toFixed(1)} C 70 ${(flourishY + 12).toFixed(1)}, 150 ${(flourishY + 8).toFixed(1)}, 230 ${(flourishY - 6).toFixed(1)} S 320 ${(flourishY - 14).toFixed(1)}, 330 ${(flourishY + 2).toFixed(1)}' stroke='#ffffff' stroke-width='1.4' fill='none' stroke-linecap='round'/>
    <path d='M 40 ${swoopY.toFixed(1)} q 60 8 140 -2' stroke='#ffffff' stroke-width='0.9' fill='none' stroke-linecap='round' opacity='0.55'/>
    <text x='170' y='104' text-anchor='middle' font-family='Inter, system-ui, sans-serif' font-size='9' fill='rgba(255,255,255,0.7)' letter-spacing='0.6'>${safeName}</text>
  </svg>`;
}