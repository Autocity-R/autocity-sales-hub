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
    const accessories = Array.isArray(body.accessories)
      ? body.accessories
          .map((a) => ({ name: String(a?.name || "").trim(), price: Number(a?.price) || 0 }))
          .filter((a) => a.name.length > 0)
      : [];
    const accessoriesTotal = accessories.reduce((s, a) => s + a.price, 0);
    const totalPrice = salePriceEx + effectiveWarrantyPrice + accessoriesTotal - tradeInValue;

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
      fuel: details.fuel || details.brandstof || null,
      transmission:
        details.transmission || details.transmissie || details.gearbox || null,
    };

    // Main photo lookup
    let mainPhotoUrl: string | null = details.mainPhotoUrl || null;
    if (!mainPhotoUrl) {
      const { data: photoRow } = await admin
        .from("vehicle_files")
        .select("url, file_url")
        .eq("vehicle_id", vehicle.id)
        .in("category", ["photo", "main_photo"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      mainPhotoUrl = (photoRow as any)?.url || (photoRow as any)?.file_url || null;
    }
    if (!mainPhotoUrl) {
      const { data: showroomRow } = await admin
        .from("vehicle_showroom_photos")
        .select("photo_url")
        .eq("vehicle_id", vehicle.id)
        .order("photo_index", { ascending: true })
        .limit(1)
        .maybeSingle();
      mainPhotoUrl = (showroomRow as any)?.photo_url || null;
    }

    // Salesperson snapshot
    const { data: prof } = await admin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .maybeSingle();
    const salespersonName =
      [prof?.first_name, prof?.last_name].filter(Boolean).join(" ") || null;
    const salespersonEmail = prof?.email || userData.user.email || null;

    // Deterministic script-style seller signature (SVG)
    const safeName = (salespersonName || "").replace(/[<>&]/g, "");
    const signatureSvg = salespersonName
      ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 80' width='240' height='60'><g fill='none' stroke='#FF6B00' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='M8 62 C 28 22, 58 22, 78 58 S 118 74, 138 34 S 178 20, 198 60 S 238 72, 258 30 S 298 24, 314 58'/></g><text x='160' y='22' text-anchor='middle' font-family='Space Grotesk, sans-serif' font-size='12' fill='#ffffff' opacity='0.9'>${safeName}</text></svg>`
      : null;

    const customerSnapshot = {
      id: customer.id,
      type: customer.type,
      companyName: customer.company_name,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      street: customer.address_street,
      number: customer.address_number,
      city: customer.address_city,
      zipCode: customer.address_postal_code,
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
        warranty_package_name: effectiveWarrantyName,
        warranty_price: effectiveWarrantyPrice || null,
        trade_in_vehicle: body.tradeInVehicle ?? null,
        trade_in_value: tradeInValue || null,
        accessories,
        financing_conditional: !!body.financingConditional,
        financing_party: body.financingParty || null,
        special_terms: body.specialTerms || null,
        total_price: totalPrice,
        main_photo_url: mainPhotoUrl,
        delivery_date: body.deliveryDate || null,
        salesperson_name: salespersonName,
        salesperson_email: salespersonEmail,
        salesperson_signature_svg: signatureSvg,
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