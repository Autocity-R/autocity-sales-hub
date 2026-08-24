import { supabase } from "@/integrations/supabase/client";

/** Statussen die als "open klus" gelden (incl. gepauzeerd). */
export const OPEN_WO_STATUSES = ["aangevraagd", "ingepland", "bezig", "gepauzeerd"] as const;
/** Actieve/lopende klussen op de vloer. */
export const ACTIVE_WO_STATUSES = ["ingepland", "bezig", "gepauzeerd"] as const;

export interface PausableWorkOrder {
  id: string;
  status?: string | null;
  started_at?: string | null;
  paused_seconds?: number | null;
}

/** Totale gewerkte seconden: eerder opgebouwd + huidige actieve sessie. */
export const totalWorkSeconds = (w: PausableWorkOrder): number => {
  const base = Number(w.paused_seconds || 0);
  if (w.status === "bezig" && w.started_at) {
    const started = new Date(w.started_at).getTime();
    return base + Math.max(0, Math.round((Date.now() - started) / 1000));
  }
  return base;
};

/** Zet een lopende klus op pauze en bewaar de gewerkte tijd. */
export const pauseWorkOrder = async (w: PausableWorkOrder, reason?: string | null) => {
  const seconds = totalWorkSeconds(w);
  return supabase
    .from("work_orders")
    .update({
      status: "gepauzeerd",
      paused_seconds: seconds,
      paused_at: new Date().toISOString(),
      pause_reason: reason?.trim() ? reason.trim() : null,
      started_at: null,
    } as any)
    .eq("id", w.id);
};

/** Velden om een klus (opnieuw) te starten. */
export const resumeFields = () => ({
  status: "bezig",
  started_at: new Date().toISOString(),
  paused_at: null,
} as any);

/** Velden om een klus af te ronden, met correcte totaaltijd. */
export const finishFields = (w: PausableWorkOrder, extra: Record<string, any> = {}) => ({
  status: "afgerond",
  finished_at: new Date().toISOString(),
  work_seconds: totalWorkSeconds(w) || null,
  paused_at: null,
  ...extra,
} as any);
