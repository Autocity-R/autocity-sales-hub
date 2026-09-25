/**
 * Poets-indeling "Afleveringen" vs "Showroom" — puur afgeleid, niets wordt geschreven.
 * Een poetsopdracht telt als aflevering als poets_type === 'aflevering' OF als er
 * voor het voertuig een geplande afleverafspraak is (zie deliveryAppointment.ts).
 * Deadline = vroegste van due_date (einde van die dag) en het afspraakmoment.
 */
import { DeliveryMoment, formatDeliveryDay, isUrgentMoment } from "./deliveryAppointment";

export interface PoetsDeadlineInput {
  poets_type: string | null;
  due_date: string | null;
  created_at: string;
  vehicle?: { id: string } | null;
}

export interface PoetsDeadline {
  at: number;
  label: string;
  urgent: boolean;
  source: "afspraak" | "due_date";
}

/** due_date is een kalenderdatum → vergelijk als einde van die dag. */
const dueDateEnd = (due: string): number => {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(due) ? new Date(`${due}T23:59:59`) : new Date(due);
  return d.getTime();
};

export const poetsDeadline = (w: PoetsDeadlineInput, delivery?: DeliveryMoment, now: Date = new Date()): PoetsDeadline | null => {
  const opts: PoetsDeadline[] = [];
  if (delivery) {
    opts.push({
      at: new Date(delivery.startTime).getTime(),
      label: delivery.label,
      urgent: isUrgentMoment(delivery.startTime, now),
      source: "afspraak",
    });
  }
  if (w.due_date) {
    const at = dueDateEnd(w.due_date);
    opts.push({
      at,
      label: formatDeliveryDay(new Date(at).toISOString()),
      urgent: at - now.getTime() <= 24 * 3600 * 1000,
      source: "due_date",
    });
  }
  if (!opts.length) return null;
  return opts.sort((a, b) => a.at - b.at)[0];
};

export const isPoetsAflevering = (w: PoetsDeadlineInput, moments: Record<string, DeliveryMoment>) =>
  w.poets_type === "aflevering" || Boolean(w.vehicle?.id && moments[w.vehicle.id]);

export function splitPoetsRows<T extends PoetsDeadlineInput>(rows: T[], moments: Record<string, DeliveryMoment>, now: Date = new Date()) {
  const dl = (w: T) => poetsDeadline(w, w.vehicle?.id ? moments[w.vehicle.id] : undefined, now)?.at ?? Number.POSITIVE_INFINITY;
  const afleveringen = rows.filter(w => isPoetsAflevering(w, moments))
    .sort((a, b) => (dl(a) - dl(b)) || a.created_at.localeCompare(b.created_at));
  const showroom = rows.filter(w => !isPoetsAflevering(w, moments))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { afleveringen, showroom };
}
