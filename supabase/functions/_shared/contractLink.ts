// Permanente, altijd-werkende downloadlink voor contract-PDF's.
// De link wijst naar de edge function `contract-pdf`, die bij elk bezoek
// een verse signed URL maakt en daarnaar redirect.

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signContractLinkToken(
  contractId: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`contract-pdf:${contractId}`),
  );
  return hex(sig).slice(0, 40);
}

/** Bouwt de publieke, niet-verlopende downloadlink voor een contract. */
export async function buildContractPdfLink(
  supabaseUrl: string,
  serviceKey: string,
  contractId: string,
): Promise<string> {
  const token = await signContractLinkToken(contractId, serviceKey);
  return `${supabaseUrl}/functions/v1/contract-pdf?c=${contractId}&t=${token}`;
}