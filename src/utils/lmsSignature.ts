/**
 * LMS-stijl mailhandtekening (Autocity Lead Hub look).
 * Naam van de ingelogde gebruiker + organisatieregel eronder.
 * Wordt gedeeld door werkplaats-bevestigingen en garantie-antwoorden.
 */
/** Officiële Autocity-logo-URL, identiek aan de LMS/verkoop-mails. */
export const AUTOCITY_LOGO_URL =
  "https://www.auto-city.nl/upload/logo/logo_images_0_1698072999114488851.png";

export function buildLmsSignatureHtml(name: string, org = "Autocity"): string {
  const safeName = (name || "Autocity").replace(/[<>]/g, "").trim();
  const safeOrg = (org || "Autocity").replace(/[<>]/g, "").trim();
  return `
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="font-size:13px;color:#475569;margin-bottom:8px">Met vriendelijke groet,</div>
  <div style="font-weight:600;color:#0f172a;font-size:14px">${safeName}</div>
  <div style="font-size:13px;color:#475569;margin-top:2px">${safeOrg}</div>
  <div style="margin:12px 0 8px"><img src="${AUTOCITY_LOGO_URL}" alt="Autocity" width="180" style="width:180px;max-width:180px;height:auto;display:block;border:0" /></div>
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
