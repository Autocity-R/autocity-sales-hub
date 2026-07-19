import { supabase } from "@/integrations/supabase/client";

export interface ContractV2Input {
  vehicleId: string;
  customerId: string;
  contractType: "b2b" | "b2c";
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
): Promise<SendContractResult> {
  const publicBaseUrl = window.location.origin;
  const { data, error } = await supabase.functions.invoke("contract-send", {
    body: { contractId, publicBaseUrl },
  });
  if (error) return { error: error.message };
  return data as SendContractResult;
}

export async function fetchContractByToken(token: string) {
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