import { supabase } from "@/integrations/supabase/client";

export interface ContractV2Input {
  vehicleId: string;
  customerId: string;
  contractType: "b2b" | "b2c";
  /** GESELECTEERDE verkoper (attributie); leeg = ingelogde gebruiker */
  salespersonId?: string | null;
  salePriceEx: number;
  btwType: "marge" | "btw";
  warrantyPackage?: string;
  warrantyPackageName?: string;
  warrantyPrice?: number;
  tradeInVehicle?: {
    brand?: string;
    model?: string;
    year?: number | null;
    licenseNumber?: string;
    mileage?: number | null;
    value?: number;
    description?: string;
  } | null;
  tradeInValue?: number;
  accessories?: Array<{ name: string; price: number }>;
  financingConditional?: boolean;
  financingParty?: string | null;
  specialTerms?: string;
  deliveryDate?: string | null;
  downPayment?: number;
}

export interface ContractV2 {
  id: string;
  contract_number: string;
  branch: string;
  status: string;
  contract_type: string;
  sale_price_ex: number | null;
  btw_type: string | null;
  warranty_package: string | null;
  warranty_price: number | null;
  trade_in_vehicle: any;
  trade_in_value: number | null;
  special_terms: string | null;
  total_price: number | null;
  down_payment?: number | null;
  vehicle_snapshot: any;
  customer_snapshot: any;
  company_snapshot: any;
  created_at: string;
}

export interface CreateContractResult {
  contract?: ContractV2;
  error?: string;
  existing?: { code?: string; name?: string; price?: number };
  detail?: string;
}

export async function createContractV2(
  input: ContractV2Input,
): Promise<CreateContractResult> {
  const { data, error } = await supabase.functions.invoke("contract-create", {
    body: input,
  });
  if (error) {
    // Try to parse structured error from function response
    const anyErr: any = error;
    const context = anyErr?.context;
    if (context && typeof context.json === "function") {
      try {
        const parsed = await context.json();
        return { ...parsed };
      } catch (_) {
        /* ignore */
      }
    }
    return { error: error.message };
  }
  return data as CreateContractResult;
}

export interface WarrantyPackageOption {
  code: string;
  name: string;
  defaultPrice: number;
}

export const WARRANTY_PACKAGE_OPTIONS: WarrantyPackageOption[] = [
  { code: "garantie_wettelijk", name: "Garantie wettelijk", defaultPrice: 0 },
  { code: "6_maanden_autocity", name: "6 Maanden Autocity garantie", defaultPrice: 295 },
  { code: "12_maanden_autocity", name: "12 Maanden Autocity garantie", defaultPrice: 495 },
  { code: "12_maanden_bovag", name: "12 Maanden Bovag garantie", defaultPrice: 595 },
  {
    code: "12_maanden_bovag_vervangend",
    name: "12 Maanden Bovag garantie (incl. vervangend vervoer)",
    defaultPrice: 795,
  },
];

export interface SendContractResult {
  ok?: boolean;
  token?: string;
  sign_url?: string;
  expires_at?: string;
  error?: string;
  detail?: string;
}

export async function sendContractV2(
  contractId: string,
  overrideEmail?: string | null,
): Promise<SendContractResult> {
  const publicBaseUrl = window.location.origin;
  const { data, error } = await supabase.functions.invoke("contract-send", {
    body: { contractId, publicBaseUrl, overrideEmail: overrideEmail ?? null },
  });
  if (error) return { error: error.message };
  return data as SendContractResult;
}

export async function fetchContractByToken(token: string) {
  return _fetchContractByToken(token);
}

/** Contract-PDF opslaan zonder digitale ondertekening (klant tekent op papier). */
export async function storeContractPdfV2(
  contractId: string,
  pdfBase64: string,
): Promise<{
  ok?: boolean;
  pdf_path?: string;
  pdf_url?: string;
  contract_number?: string;
  error?: string;
  detail?: string;
}> {
  const { data, error } = await supabase.functions.invoke("contract-store", {
    body: { contractId, pdf_base64: pdfBase64 },
  });
  if (error) return { error: error.message };
  return data as any;
}

/** Opgeslagen contract-PDF mailen naar administratie of een eigen ontvanger. */
export async function sendContractPdfByEmail(params: {
  contractId: string;
  mode?: "administratie" | "custom";
  to?: string[];
  note?: string;
}): Promise<{ ok?: boolean; to?: string[]; error?: string; detail?: string }> {
  const { data, error } = await supabase.functions.invoke(
    "contract-to-administration",
    { body: params },
  );
  if (error) return { error: error.message };
  return data as any;
}

async function _fetchContractByToken(token: string) {
  const { data, error } = await supabase.rpc("get_contract_by_token" as any, {
    _token: token,
  });
  if (error) return { error: error.message } as { error: string };
  return { data } as { data: any };
}

export async function submitContractSignature(payload: {
  token: string;
  signature_data_url: string;
  pdf_base64: string;
  signer_name?: string;
  signer_email?: string;
}) {
  const { data, error } = await supabase.functions.invoke("contract-sign", {
    body: {
      ...payload,
      user_agent: navigator.userAgent,
    },
  });
  if (error) return { error: error.message } as { error: string };
  return data as { ok?: boolean; pdf_url?: string; error?: string };
}

export async function fetchSignedContractDownload(token: string) {
  const { data, error } = await supabase.functions.invoke(
    "contract-signed-download",
    { body: { token } },
  );
  if (error) return { error: error.message } as { error: string };
  return data as { ok?: boolean; signed_at?: string; pdf_url?: string; error?: string };
}

export interface VehicleContractV2 {
  id: string;
  contract_number: string;
  contract_type: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  signed_at: string | null;
  opened_at: string | null;
  pdf_path: string | null;
  pdf_url: string | null;
}

/** Alle v2-contracten van een voertuig, met status-keten en getekende PDF-link. */
export async function fetchVehicleContractsV2(
  vehicleId: string,
): Promise<VehicleContractV2[]> {
  const { data, error } = await supabase
    .from("contract_documents")
    .select(
      "id, contract_number, contract_type, status, created_at, sent_at, signed_at, contract_signatures(opened_at, signed_at, pdf_path, created_at)",
    )
    .eq("vehicle_id", vehicleId)
    .neq("status", "geannuleerd")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[CONTRACT_V2] fetch vehicle contracts failed", error);
    return [];
  }

  return Promise.all(
    (data || []).map(async (doc: any) => {
      const sigs: any[] = doc.contract_signatures || [];
      const signedSig = sigs.find((s) => s.signed_at);
      const latest =
        signedSig ||
        [...sigs].sort((a, b) =>
          (b.created_at || "").localeCompare(a.created_at || ""),
        )[0];
      const pdfPath = signedSig?.pdf_path ?? null;
      let pdfUrl: string | null = null;
      if (pdfPath) {
        const { data: signed } = await supabase.storage
          .from("vehicle-documents")
          .createSignedUrl(pdfPath, 3600);
        pdfUrl = signed?.signedUrl ?? null;
      }
      return {
        id: doc.id,
        contract_number: doc.contract_number,
        contract_type: doc.contract_type,
        status: doc.status,
        created_at: doc.created_at,
        sent_at: doc.sent_at,
        signed_at: doc.signed_at ?? signedSig?.signed_at ?? null,
        opened_at: latest?.opened_at ?? null,
        pdf_path: pdfPath,
        pdf_url: pdfUrl,
      } as VehicleContractV2;
    }),
  );
}

/** Contract intrekken: tekenlink direct ongeldig + document uit de lijst. */
export async function cancelContractV2(
  contractId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("cancel_contract_v2" as any, {
    _contract_id: contractId,
  });
  if (error) return { error: error.message };
  return (data as any) || {};
}

/** Eenmalig registreren dat de klant de tekenlink heeft geopend. */
export async function markContractOpened(token: string): Promise<void> {
  try {
    await supabase.rpc("mark_contract_opened" as any, { _token: token });
  } catch (e) {
    console.warn("[CONTRACT_V2] mark opened failed", e);
  }
}