import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  vehicleId: string;
  customerId: string;
  contractType: "b2b" | "b2c";
  salePriceEx: number;
  btwType: "marge" | "btw";
  warrantyPackage?: string;
  warrantyPackageName?: string;
  warrantyPrice?: number;
  tradeInVehicle?: {
    description?: string;
    licenseNumber?: string;
    value?: number;
  } | null;
  tradeInValue?: number;
  specialTerms?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Identify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "unauthenticated" }, 401);
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const body = (await req.json()) as Payload;

    if (!body?.vehicleId || !body?.customerId || !body?.contractType) {
      return json({ error: "missing_fields" }, 400);
    }

    // Load vehicle
    const { data: vehicle, error: vErr } = await admin
      .from("vehicles")
      .select("id, brand, model, year, license_number, vin, mileage, color, branch, details, selling_price")
      .eq("id", body.vehicleId)
      .single();
    if (vErr || !vehicle) return json({ error: "vehicle_not_found" }, 404);

    const branch: string = vehicle.branch || "rotterdam";
    const details: any = vehicle.details || {};
    const existingWarrantyPrice = Number(details.warrantyPackagePrice || 0);
    const hasExistingWarranty = existingWarrantyPrice > 0;

    // HARDE REGEL: één pakket per voertuig
    if (body.warrantyPackage && hasExistingWarranty) {
      return json(
        {
          error: "warranty_already_registered",
          existing: {
            code: details.warrantyPackage,
            name: details.warrantyPackageName,
            price: existingWarrantyPrice,
          },
        },
        409,
      );
    }

    // Load customer
    const { data: customer, error: cErr } = await admin
      .from("contacts")
      .select("*")
      .eq("id", body.customerId)
      .single();
    if (cErr || !customer) return json({ error: "customer_not_found" }, 404);

    // Load branch entity
    const { data: branchRow } = await admin
      .from("branches")
      .select("*")
      .eq("code", branch)
      .maybeSingle();

    // Effective warranty on the contract
    const effectiveWarrantyCode =
      body.warrantyPackage ?? (hasExistingWarranty ? details.warrantyPackage : null);
    const effectiveWarrantyName =
      body.warrantyPackageName ??
      (hasExistingWarranty ? details.warrantyPackageName : null);
    const effectiveWarrantyPrice = body.warrantyPackage
      ? Number(body.warrantyPrice || 0)
      : hasExistingWarranty
        ? existingWarrantyPrice
        : 0;

    const tradeInValue = Number(body.tradeInValue || body.tradeInVehicle?.value || 0);
    const salePriceEx = Number(body.salePriceEx || 0);
    const totalPrice = salePriceEx + effectiveWarrantyPrice - tradeInValue;

    // Snapshots
    const vehicleSnapshot = {
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      licenseNumber: vehicle.license_number,
      vin: vehicle.vin,
      mileage: vehicle.mileage,
      color: vehicle.color,
      version: details.version || details.trim || null,
    };
    const customerSnapshot = {
      id: customer.id,
      type: customer.type,
      companyName: customer.company_name,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address_street,
      street: customer.address_street,
      number: customer.address_number,
      city: customer.address_city,
      zipCode: customer.address_zip_code,
      country: customer.address_country,
    };
    const companySnapshot = branchRow
      ? {
          code: branchRow.code,
          name: branchRow.name,
          companyName: branchRow.company_name,
          address: branchRow.address,
          postalCode: branchRow.postal_code,
          city: branchRow.city,
          phone: branchRow.phone,
          email: branchRow.email,
          kvk: branchRow.kvk_number,
          btw: branchRow.btw_number,
          iban: branchRow.iban,
        }
      : { code: branch, name: branch };

    // Insert contract
    const { data: contract, error: insErr } = await admin
      .from("contract_documents")
      .insert({
        vehicle_id: vehicle.id,
        customer_id: customer.id,
        branch,
        status: "concept",
        contract_type: body.contractType,
        vehicle_snapshot: vehicleSnapshot,
        customer_snapshot: customerSnapshot,
        company_snapshot: companySnapshot,
        sale_price_ex: salePriceEx,
        btw_type: body.btwType,
        warranty_package: effectiveWarrantyCode,
        warranty_price: effectiveWarrantyPrice || null,
        trade_in_vehicle: body.tradeInVehicle ?? null,
        trade_in_value: tradeInValue || null,
        special_terms: body.specialTerms || null,
        total_price: totalPrice,
        created_by: userId,
      })
      .select("*")
      .single();

    if (insErr) {
      console.error("contract insert failed", insErr);
      return json({ error: "insert_failed", detail: insErr.message }, 500);
    }

    // Register warranty on vehicle if new
    if (body.warrantyPackage && !hasExistingWarranty) {
      const nowIso = new Date().toISOString();
      const newDetails = {
        ...details,
        warrantyPackage: body.warrantyPackage,
        warrantyPackageName: body.warrantyPackageName || body.warrantyPackage,
        warrantyPackagePrice: Number(body.warrantyPrice || 0),
        warrantyPackageSource: "contract",
        warrantyPackageDate: nowIso,
      };
      const { error: updErr } = await admin
        .from("vehicles")
        .update({ details: newDetails })
        .eq("id", vehicle.id);
      if (updErr) console.warn("warranty registration on vehicle failed", updErr);
    }

    return json({ contract });
  } catch (err) {
    console.error(err);
    return json({ error: "unexpected", detail: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}