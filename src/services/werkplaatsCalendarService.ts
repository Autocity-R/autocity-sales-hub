import { supabase } from "@/integrations/supabase/client";

export const WERKPLAATS_SERVICE_ACCOUNT_EMAIL =
  "auto-city-calendar-service@lovable-calendar-integratie.iam.gserviceaccount.com";

export interface WerkplaatsCalendarSettings {
  id: string;
  branch: string;
  calendar_id: string | null;
  calendar_name: string | null;
  sync_enabled: boolean;
  connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
}

const table = () => (supabase as any).from("werkplaats_calendar_settings");

export async function fetchWerkplaatsCalendarSettings(
  branch = "rotterdam",
): Promise<WerkplaatsCalendarSettings | null> {
  const { data, error } = await table().select("*").eq("branch", branch).maybeSingle();
  if (error) throw error;
  return (data as WerkplaatsCalendarSettings) ?? null;
}

export async function saveWerkplaatsCalendarSettings(
  branch: string,
  patch: Partial<Pick<WerkplaatsCalendarSettings, "calendar_id" | "sync_enabled">>,
) {
  const { error } = await table().upsert({ branch, ...patch }, { onConflict: "branch" });
  if (error) throw error;
}

async function invoke(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("werkplaats-calendar-sync", { body: payload });
  if (error) throw error;
  if (data && data.success === false) throw new Error(data.error || "Onbekende fout");
  return data as any;
}

export async function testWerkplaatsCalendar(branch: string, calendarId?: string) {
  return invoke({ action: "test", branch, calendar_id: calendarId });
}

/** Fire-and-forget: een sync-fout mag het opslaan NOOIT blokkeren. */
export function syncWorkOrderToWerkplaatsCalendar(
  workOrderId: string,
  branch = "rotterdam",
): void {
  void (async () => {
    try {
      const settings = await fetchWerkplaatsCalendarSettings(branch);
      if (!settings?.sync_enabled || !settings.calendar_id) return;
      await invoke({ action: "push", branch, work_order_id: workOrderId });
    } catch (e) {
      console.warn("[werkplaats-agenda] push mislukt:", e);
    }
  })();
}

export function removeWorkOrderFromWerkplaatsCalendar(
  workOrderId: string,
  branch = "rotterdam",
): void {
  void (async () => {
    try {
      const settings = await fetchWerkplaatsCalendarSettings(branch);
      if (!settings?.sync_enabled || !settings.calendar_id) return;
      await invoke({ action: "remove", branch, work_order_id: workOrderId });
    } catch (e) {
      console.warn("[werkplaats-agenda] remove mislukt:", e);
    }
  })();
}
