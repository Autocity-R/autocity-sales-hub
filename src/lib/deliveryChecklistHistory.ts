/** Aflever-checklist terugkijken: wat stond er op het moment van aflevering afgevinkt? (alleen lezen) */
export interface ChecklistItemRaw {
  id?: string;
  description?: string;
  completed?: boolean;
  completedAt?: string | null;
  completedByName?: string | null;
  createdAt?: string | null;
  createdByName?: string | null;
  completedVia?: string | null;
}

export interface ChecklistHistoryRow {
  id: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
  completedByName: string | null;
  createdAt: string | null;
  createdByName: string | null;
  /** Bestond het punt al op het moment van aflevering? */
  existedAtDelivery: boolean;
  /** Was het punt afgevinkt op het moment van aflevering? */
  doneAtDelivery: boolean;
}

const t = (s?: string | null) => (s ? new Date(s).getTime() : NaN);

export function checklistHistory(items: unknown, deliveredAt: string | Date | null | undefined) {
  const list = Array.isArray(items) ? (items as ChecklistItemRaw[]) : [];
  const d = deliveredAt ? new Date(deliveredAt).getTime() : NaN;
  const rows: ChecklistHistoryRow[] = list.map((i, idx) => {
    const created = t(i.createdAt);
    const done = t(i.completedAt);
    const existed = isNaN(d) || isNaN(created) || created <= d;
    const doneAtDelivery = !!i.completed && (isNaN(d) || isNaN(done) || done <= d);
    return {
      id: i.id || String(idx),
      description: i.description || "—",
      completed: !!i.completed,
      completedAt: i.completedAt || null,
      completedByName: i.completedByName || (i.completedVia === "qr" ? "Medewerker (via QR)" : null),
      createdAt: i.createdAt || null,
      createdByName: i.createdByName || null,
      existedAtDelivery: existed,
      doneAtDelivery: existed && doneAtDelivery,
    };
  });
  const atDelivery = rows.filter(r => r.existedAtDelivery);
  const pct = atDelivery.length ? Math.round((atDelivery.filter(r => r.doneAtDelivery).length / atDelivery.length) * 100) : null;
  return { rows, percentAtDelivery: pct, totalAtDelivery: atDelivery.length };
}
