/** "Mijn prestaties": gewerkte tijd vandaag van de ingelogde medewerker. */
import { secondsWithinWork, getWorkSchedule, nlToUtc, type WorkSchedule } from "@/lib/workHours";
import { nlDay } from "@/lib/performanceGroups";
import { usesTijdregels, groupByOrder, type Tijdregel } from "@/lib/tijdregels";

interface DoneOrder { id: string; work_seconds: number | null; finished_at: string | null; approved_at: string | null }

/**
 * Eigen tijdregels: het deel dat vandaag (NL) binnen werktijd viel; een lopende regel telt tot nu.
 * Klussen zonder tijdregels: work_seconds van wat vandaag klaar was (oude berekening).
 */
export function gewerktVandaagSeconden(done: DoneOrder[], mijnRegels: Tijdregel[], now: Date = new Date(), sched: WorkSchedule = getWorkSchedule()): number {
  const today = nlDay(now.toISOString());
  const [y, m, d] = today.split("-").map(Number);
  const dayStart = nlToUtc(y, m, d, "00:00");
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const dayEnd = nlToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), "00:00");
  const byOrder = groupByOrder(mijnRegels);
  let total = 0;
  done.forEach(o => {
    if (usesTijdregels(byOrder.get(o.id))) return;
    const ts = o.finished_at || o.approved_at;
    if (ts && nlDay(ts) === today) total += Number(o.work_seconds || 0);
  });
  byOrder.forEach(list => {
    if (!usesTijdregels(list)) return;
    list.forEach(r => {
      const from = Math.max(+new Date(r.gestart_op), dayStart);
      const to = Math.min(r.gestopt_op ? +new Date(r.gestopt_op) : +now, dayEnd, +now);
      if (to > from) total += secondsWithinWork(from, to, sched);
    });
  });
  return Math.round(total);
}
