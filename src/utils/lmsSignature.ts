/**
 * LMS-stijl mailhandtekening (Autocity Lead Hub look).
 * Naam van de ingelogde gebruiker + organisatieregel eronder.
 * Wordt gedeeld door werkplaats-bevestigingen en garantie-antwoorden.
 */
/** Werkende LMS/verkoop-logo-URL die in contractmails al zichtbaar doorkomt in Gmail. */
export const AUTOCITY_LOGO_URL =
  "https://www.auto-city.nl/upload/logo/logo_images_0_1698072999114488851.png";

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
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;color:#222">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;font-size:12px;color:#555;table-layout:fixed">
    <tr>
      <td style="vertical-align:middle;width:72px;padding:0;">
        <div style="background:#000000;width:64px;height:64px;border-radius:4px;padding:8px;box-sizing:border-box;">
          <img src="${AUTOCITY_LOGO_URL}" alt="Auto City" style="width:100%;height:100%;object-fit:contain;display:block;border:0;" />
        </div>
      </td>
      <td style="vertical-align:middle;line-height:1.6;border-left:3px solid #FF6B00;padding-left:14px;">
        <div style="color:#333;">Met vriendelijke groet,</div>
        <div style="font-weight:600;color:#222;">${safeName}</div>
        <div>${safeOrg}</div>
        <div>Tel: 010-2623980</div>
        <div><a href="https://www.auto-city.nl" style="color:#FF6B00;text-decoration:none;">www.auto-city.nl</a></div>
      </td>
    </tr>
  </table>
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
