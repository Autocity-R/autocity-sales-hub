/**
 * Aflevermoment per voertuig — ALLEEN LEZEN uit appointments (zelfde bron als het
 * aftersales-dashboard-widget). Nooit schrijven.
 *
 * Regels (overal identiek): type 'aflevering', status niet 'geannuleerd',
 * eerstvolgende vanaf vandaag, weergave in NL-tijd (Europe/Amsterdam).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryMoment {
  vehicleId: string;
  startTime: string;
  /** "za 03-10 10:00" (NL-tijd) */
  label: string;
  isToday: boolean;
  /** Binnen 24 uur vanaf nu (of al voorbij) */
  isUrgent: boolean;
}

const TZ = "Europe/Amsterdam";

const parts = (d: Date) => {
  const p = new Intl.DateTimeFormat("nl-NL", {
    timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit",
    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => p.find(x => x.type === t)?.value ?? "";
  return {
    weekday: get("weekday").replace(".", "").slice(0, 2),
    day: get("day"), month: get("month"), year: get("year"),
    hour: get("hour"), minute: get("minute"),
  };
};

/** "za 03-10 10:00" in NL-tijd */
export const formatDeliveryMoment = (startTime: string): string => {
  const p = parts(new Date(startTime));
  return `${p.weekday} ${p.day}-${p.month} ${p.hour}:${p.minute}`;
};

/** "za 03-10" in NL-tijd (datum zonder tijd) */
export const formatDeliveryDay = (iso: string): string => {
  const p = parts(new Date(iso));
  return `${p.weekday} ${p.day}-${p.month}`;
};

const nlDayKey = (d: Date) => { const p = parts(d); return `${p.year}-${p.month}-${p.day}`; };

export const isUrgentMoment = (iso: string, now: Date = new Date()): boolean =>
  new Date(iso).getTime() - now.getTime() <= 24 * 3600 * 1000;

export const toDeliveryMoment = (vehicleId: string, startTime: string, now: Date = new Date()): DeliveryMoment => ({
  vehicleId,
  startTime,
  label: formatDeliveryMoment(startTime),
  isToday: nlDayKey(new Date(startTime)) === nlDayKey(now),
  isUrgent: isUrgentMoment(startTime, now),
});

/**
 * Kies per voertuig de eerstvolgende afspraak uit (reeds gefilterde) rijen.
 * Pure functie — getest.
 */
export const pickDeliveryMoments = (
  rows: Array<{ vehicleid: string | null; starttime: string; status?: string | null; type?: string | null }>,
  now: Date = new Date(),
): Record<string, DeliveryMoment> => {
  const next: Record<string, DeliveryMoment> = {};
  [...rows]
    .filter(a => a.vehicleid && (a.type == null || a.type === "aflevering") && a.status !== "geannuleerd")
    .sort((a, b) => a.starttime.localeCompare(b.starttime))
    .forEach(a => {
      if (!next[a.vehicleid!]) next[a.vehicleid!] = toDeliveryMoment(a.vehicleid!, a.starttime, now);
    });
  return next;
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
      const all: any[] = [];
      // In brokken om de URL-lengte te begrenzen
      for (let i = 0; i < ids.length; i += 150) {
        const { data } = await supabase
          .from("appointments")
          .select("id, vehicleid, starttime, status, type")
          .eq("type", "aflevering")
          .neq("status", "geannuleerd")
          .in("vehicleid", ids.slice(i, i + 150))
          .gte("starttime", fromTs)
          .order("starttime", { ascending: true });
        all.push(...(data || []));
      }
      if (cancelled) return;
      setMap(pickDeliveryMoments(all));
    })();
    return () => { cancelled = true; };
  }, [key]);

  return map;
};
