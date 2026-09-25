import type { Vehicle } from "@/types/inventory";

export interface ChecklistProgress {
  completed: number;
  total: number;
  /** 0–100, afgerond; 0 bij geen items */
  percentage: number;
  hasItems: boolean;
}

/** Eén bron voor checklist-voortgang (details.preDeliveryChecklist). */
export const getChecklistProgress = (vehicle: Pick<Vehicle, "details"> | null | undefined): ChecklistProgress => {
  const list = (vehicle?.details as any)?.preDeliveryChecklist;
  const checklist: Array<{ completed?: boolean }> = Array.isArray(list) ? list : [];
  const total = checklist.length;
  const completed = checklist.filter(i => i?.completed).length;
  return {
    completed,
    total,
    percentage: total ? Math.round((completed / total) * 100) : 0,
    hasItems: total > 0,
  };
};

export type SortDir = "asc" | "desc";

const IMPORT_ORDER: Record<string, number> = {
  niet_aangemeld: 1, aanvraag_ontvangen: 2, bestanden_gevraagd: 3, keuringsafspraak: 3,
  herkeuring: 3, goedgekeurd: 4, toonplicht: 5, bpm_betaald: 6, ingeschreven: 7,
};

/**
 * Sorteerwaarde per kolom van de Verkocht B2C-tabel. null = leeg → altijd onderaan.
 * Voortgang: auto's zonder checklist-items tellen als leeg, zodat ze bij oplopend
 * ná de auto's met items komen.
 */
export const b2cSortValue = (
  v: Vehicle,
  field: string,
  deliveryDates: Record<string, string> = {},
): string | number | null => {
  switch (field) {
    case "checklistProgress": {
      const p = getChecklistProgress(v);
      return p.hasItems ? p.percentage : null;
    }
    case "importStatus": return v.importStatus ? (IMPORT_ORDER[v.importStatus] ?? 0) : null;
    case "deliveryDate": {
      const d = deliveryDates[v.id];
      return d ? new Date(d).getTime() : null;
    }
    default: {
      const raw = field.split(".").reduce<any>((o, k) => o?.[k], v);
      if (raw === undefined || raw === null || raw === "") return null;
      if (typeof raw === "number") return raw;
      if (typeof raw === "boolean") return raw ? 1 : 0;
      return String(raw);
    }
  }
};

export const sortB2CVehicles = (
  list: Vehicle[],
  field: string | null,
  dir: SortDir,
  deliveryDates: Record<string, string> = {},
): Vehicle[] => {
  if (!field) return list;
  const sign = dir === "asc" ? 1 : -1;
  return list
    .map((v, i) => ({ v, i, k: b2cSortValue(v, field, deliveryDates) }))
    .sort((a, b) => {
      if (a.k === null && b.k === null) return a.i - b.i;
      if (a.k === null) return 1;
      if (b.k === null) return -1;
      const c = typeof a.k === "number" && typeof b.k === "number"
        ? a.k - b.k
        : String(a.k).localeCompare(String(b.k), "nl", { numeric: true, sensitivity: "base" });
      return c !== 0 ? c * sign : a.i - b.i;
    })
    .map(x => x.v);
};
