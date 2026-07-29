/**
 * LMS-stijl mailhandtekening (Autocity Lead Hub look).
 * Naam van de ingelogde gebruiker + organisatieregel eronder.
 * Wordt gedeeld door werkplaats-bevestigingen en garantie-antwoorden.
 */
/** Officiële Autocity-logo (zwart/wit blok) — publiek bereikbaar voor e-mailclients. */
export const AUTOCITY_LOGO_URL =
  "https://fnwagrmoyfyimdoaynkg.supabase.co/storage/v1/object/public/email-assets/autocity-logo-v3.png";

/**
 * Werkplaats-adres per vestiging (LOS van het verkoop-/vestigingsadres in `branches`).
 * Wordt gebruikt in bevestigingsmails van werkplaatsafspraken.
 */
export const WORKSHOP_LOCATIONS: Record<string, { name: string; address: string; phone: string }> = {
  rotterdam: {
    name: "Autocity Werkplaats",
    address: "Calandstraat 94, Schiedam",
    phone: "010-2623980",
  },
};

/** Nette locatieregel voor de werkplaats; valt terug op het vestigingsadres. */
export function workshopLocationLine(
  branchCode: string | null | undefined,
  fallback?: { company_name?: string | null; address?: string | null; postal_code?: string | null; city?: string | null; phone?: string | null } | null,
): { line: string; phone: string } {
  const w = WORKSHOP_LOCATIONS[(branchCode || "").toLowerCase()];
  if (w) return { line: `${w.name} — ${w.address}`, phone: w.phone };
  const addressLine = [fallback?.address, [fallback?.postal_code, fallback?.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return {
    line: `${fallback?.company_name || "Autocity"}${addressLine ? ` — ${addressLine}` : ""}`,
    phone: fallback?.phone || "010-2623980",
  };
}

export function buildLmsSignatureHtml(name: string, org = "Autocity"): string {
  const safeName = (name || "Autocity").replace(/[<>]/g, "").trim();
  const safeOrg = (org || "Autocity").replace(/[<>]/g, "").trim();
  return `
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="font-size:13px;color:#475569;margin-bottom:8px">Met vriendelijke groet,</div>
  <div style="font-weight:600;color:#0f172a;font-size:14px">${safeName}</div>
  <div style="font-size:13px;color:#475569;margin-top:2px">${safeOrg}</div>
  <div style="margin:16px 0 10px"><img src="${AUTOCITY_LOGO_URL}" alt="Autocity" width="110" height="110" style="width:110px;height:110px;max-width:110px;display:block;border:0;border-radius:10px" /></div>
  <div style="font-size:13px;color:#475569;margin-top:2px">📞 010 262 3980 · 🌐 <a style="color:#f97316;text-decoration:none" href="https://www.auto-city.nl">www.auto-city.nl</a></div>
</div>`;
}

/** Volledige naam van een profielrij, met nette fallback. */
export function profileFullName(
  profile?: { first_name?: string | null; last_name?: string | null } | null,
  fallbackEmail?: string | null,
): string {
  const n = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
  if (n) return n;
  return (fallbackEmail || "Autocity").split("@")[0];
}
