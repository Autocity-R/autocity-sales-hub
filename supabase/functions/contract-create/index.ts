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
    const signatureSvg = buildSalespersonSignatureSvg(salespersonName);

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
        salesperson_signature_png: null,
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

// Elegant deterministic script signature from initials + full name.
// Mirrors src/utils/salespersonSignature.ts.
function buildSalespersonSignatureSvg(fullName: string | null): string | null {
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
  let seed = 0;
  for (let i = 0; i < safeName.length; i++) seed = (seed * 31 + safeName.charCodeAt(i)) & 0xffff;
  const s = (n: number, range: number) => ((seed >> n) & 0x1f) / 31 * range - range / 2;
  const tilt = -5 + s(0, 3);
  const flourishY = 78 + s(3, 4);
  const swoopY = 90 + s(6, 4);
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 340 110' width='260' height='84'>
    <defs><style>@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&amp;family=Dancing+Script:wght@600;700&amp;family=Inter:wght@400;500&amp;display=swap');</style></defs>
    <g transform='translate(24,${72 + s(9, 3)}) rotate(${tilt.toFixed(2)})'>
      <text x='0' y='0' font-family='Great Vibes, Dancing Script, cursive' font-size='72' fill='#111' font-weight='400'>${initials}</text>
    </g>
    <path d='M 14 ${flourishY.toFixed(1)} C 70 ${(flourishY + 12).toFixed(1)}, 150 ${(flourishY + 8).toFixed(1)}, 230 ${(flourishY - 6).toFixed(1)} S 320 ${(flourishY - 14).toFixed(1)}, 330 ${(flourishY + 2).toFixed(1)}' stroke='#111' stroke-width='1.4' fill='none' stroke-linecap='round'/>
    <path d='M 40 ${swoopY.toFixed(1)} q 60 8 140 -2' stroke='#111' stroke-width='0.9' fill='none' stroke-linecap='round' opacity='0.55'/>
    <text x='170' y='104' text-anchor='middle' font-family='Inter, system-ui, sans-serif' font-size='9' fill='#555' letter-spacing='0.6'>${safeName}</text>
  </svg>`;
}