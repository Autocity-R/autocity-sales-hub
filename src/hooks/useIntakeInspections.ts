import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IntakeInspectionRow {
  id: string;
  vehicle_id: string;
  created_at: string;
  created_by_name: string | null;
  status: string;
  error_message: string | null;
  categorie: "A" | "B" | "C" | null;
  totale_kosten_min: number | null;
  totale_kosten_max: number | null;
  schade_count: number | null;
  claim_aanbevolen: boolean | null;
  claim_waarde: number | null;
  samenvatting_team: string | null;
  pdf_url: string | null;
  frames_extracted: number | null;
}

export function useIntakeInspections(vehicleId: string | undefined) {
  const [inspections, setInspections] = useState<IntakeInspectionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("intake_inspections")
      .select("id,vehicle_id,created_at,created_by_name,status,error_message,categorie,totale_kosten_min,totale_kosten_max,schade_count,claim_aanbevolen,claim_waarde,samenvatting_team,pdf_url,frames_extracted")
      .eq("vehicle_id", vehicleId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!error && data) setInspections(data as IntakeInspectionRow[]);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => {
    fetchAll();
    if (!vehicleId) return;
    const ch = supabase
      .channel(`intake_inspections_${vehicleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "intake_inspections", filter: `vehicle_id=eq.${vehicleId}` },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [vehicleId, fetchAll]);

  return { inspections, loading, refresh: fetchAll };
}