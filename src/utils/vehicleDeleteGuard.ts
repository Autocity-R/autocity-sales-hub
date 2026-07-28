import { supabase } from "@/integrations/supabase/client";

/** Herkent de database-beveiliging op voertuigen met werkplaats-historie. */
export const isWorkshopHistoryError = (error: any): boolean => {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;
  return msg.includes("VEHICLE_HAS_WORKSHOP_HISTORY");
};

/** Leesbare labels (Merk Model · kenteken) voor een lijst voertuig-id's. */
export const fetchVehicleLabels = async (ids: string[]): Promise<string[]> => {
  if (!ids.length) return [];
  const { data } = await supabase
    .from("vehicles")
    .select("id, brand, model, license_number")
    .in("id", ids);
  const map = new Map((data ?? []).map((v: any) => [v.id, v]));
  return ids.map((id) => {
    const v: any = map.get(id);
    if (!v) return id;
    return `${v.brand ?? ""} ${v.model ?? ""}${v.license_number ? ` · ${v.license_number}` : ""}`.trim();
  });
};
