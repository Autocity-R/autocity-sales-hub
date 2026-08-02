import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Kalenderdatum in Europe/Amsterdam als "YYYY-MM-DD". */
const amsDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

/** Maandag van de week waarin `day` (YYYY-MM-DD) valt. */
const mondayOf = (day: string, weeksBack = 0) => {
  const base = new Date(`${day}T12:00:00Z`);
  const dow = base.getUTCDay(); // 0 = zo
  const diff = (dow === 0 ? 6 : dow - 1) + weeksBack * 7;
  base.setUTCDate(base.getUTCDate() - diff);
  return base.toISOString().slice(0, 10);
};

export interface MyWorkPerformance {
  today: number;
  week: number;
  month: number;
  prevWeek: number;
  partsToday: number;
  partsWeek: number;
  partsMonth: number;
  secondsToday: number;
  rejectedMonth: number;
}

const EMPTY: MyWorkPerformance = {
  today: 0, week: 0, month: 0, prevWeek: 0,
  partsToday: 0, partsWeek: 0, partsMonth: 0,
  secondsToday: 0, rejectedMonth: 0,
};

/**
 * Eigen prestatie-cijfers van de ingelogde medewerker.
 * Een klus is "geklaard" bij status afgerond OF goedgekeurd (goedkeuren is een
 * administratieve stap ná afronden, dus beide tellen één keer mee).
 */
export const useMyWorkPerformance = (discipline: "werkplaats" | "spuit") => {
  const [data, setData] = useState<MyWorkPerformance>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) { setData(EMPTY); setLoading(false); return; }

    const now = new Date();
    const today = amsDay(now);
    const monthPrefix = today.slice(0, 7);
    const weekStart = mondayOf(today);
    const prevWeekStart = mondayOf(today, 1);
    const monthStart = `${monthPrefix}-01`;
    const from = prevWeekStart < monthStart ? prevWeekStart : monthStart;

    const { data: rows } = await supabase
      .from("work_orders")
      .select("id, status, parts, part, work_seconds, finished_at, approved_at, rejected_count")
      .eq("discipline", discipline)
      .eq("assigned_to", uid)
      .in("status", ["afgerond", "goedgekeurd"])
      .gte("finished_at", `${from}T00:00:00Z`)
      .limit(1000);

    const acc = { ...EMPTY };
    for (const r of ((rows as any[]) || [])) {
      const ts = r.finished_at || r.approved_at;
      if (!ts) continue;
      const day = amsDay(new Date(ts));
      const parts = Array.isArray(r.parts) && r.parts.length ? r.parts.length : (r.part ? 1 : 1);

      if (day === today) {
        acc.today += 1; acc.partsToday += parts;
        acc.secondsToday += Number(r.work_seconds || 0);
      }
      if (day >= weekStart) { acc.week += 1; acc.partsWeek += parts; }
      else if (day >= prevWeekStart) { acc.prevWeek += 1; }
      if (day.startsWith(monthPrefix)) {
        acc.month += 1; acc.partsMonth += parts;
        acc.rejectedMonth += Number(r.rejected_count || 0);
      }
    }
    setData(acc);
    setLoading(false);
  }, [discipline]);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return { data, loading, reload: load };
};
