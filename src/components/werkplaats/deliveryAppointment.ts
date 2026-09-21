/**
 * Aflevermoment per voertuig — ALLEEN LEZEN uit appointments (zelfde bron als het
 * aftersales-dashboard-widget). Nooit schrijven.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow } from "date-fns";
import { nl } from "date-fns/locale";

export interface DeliveryMoment {
  vehicleId: string;
  startTime: string;
  /** "vandaag 14:00" · "morgen 10:00" · "wo 24-9 14:00" */
  label: string;
  isToday: boolean;
}

export const formatDeliveryMoment = (startTime: string): string => {
  const d = new Date(startTime);
  const time = format(d, "HH:mm");
  if (isToday(d)) return `vandaag ${time}`;
  if (isTomorrow(d)) return `morgen ${time}`;
  return `${format(d, "EEEEEE d-M", { locale: nl })} ${time}`;
};

/**
 * Eerstvolgende geplande aflever-afspraak per voertuig (gededupliceerd).
 * Lege lijst in → geen query.
 */
export const useDeliveryMoments = (vehicleIds: string[]): Record<string, DeliveryMoment> => {
  const [map, setMap] = useState<Record<string, DeliveryMoment>>({});
  const key = Array.from(new Set(vehicleIds.filter(Boolean))).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) {
      setMap({});
      return;
    }
    (async () => {
      const fromTs = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const { data } = await supabase
        .from("appointments")
        .select("id, vehicleid, starttime, status, type")
        .eq("type", "aflevering")
        .neq("status", "geannuleerd")
        .in("vehicleid", ids)
        .gte("starttime", fromTs)
        .order("starttime", { ascending: true });
      if (cancelled) return;
      const next: Record<string, DeliveryMoment> = {};
      (data || []).forEach((a: any) => {
        if (!a.vehicleid || next[a.vehicleid]) return; // eerstvolgende wint
        next[a.vehicleid] = {
          vehicleId: a.vehicleid,
          startTime: a.starttime,
          label: formatDeliveryMoment(a.starttime),
          isToday: isToday(new Date(a.starttime)),
        };
      });
      setMap(next);
    })();
    return () => { cancelled = true; };
  }, [key]);

  return map;
};
