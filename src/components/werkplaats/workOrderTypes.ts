export type WorkOrderDiscipline = "spuit" | "werkplaats" | "uitdeuk" | "poets";
export type WorkOrderStatus =
  | "aangevraagd"
  | "ingepland"
  | "bezig"
  | "afgerond"
  | "goedgekeurd"
  | "geannuleerd";

export const DISCIPLINE_LABELS: Record<WorkOrderDiscipline, string> = {
  spuit: "Spuiterij",
  werkplaats: "Werkplaats",
  uitdeuk: "Uitdeuken (extern)",
  poets: "Poets",
};

export const DISCIPLINE_ICON: Record<WorkOrderDiscipline, string> = {
  spuit: "🎨",
  werkplaats: "🔧",
  uitdeuk: "🪛",
  poets: "✨",
};

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  aangevraagd: "Aangevraagd",
  ingepland: "Ingepland",
  bezig: "Bezig",
  afgerond: "Afgerond",
  goedgekeurd: "Goedgekeurd",
  geannuleerd: "Geannuleerd",
};

export const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  aangevraagd: "bg-slate-100 text-slate-700 border-slate-200",
  ingepland:   "bg-blue-100 text-blue-800 border-blue-200",
  bezig:       "bg-amber-100 text-amber-800 border-amber-200",
  afgerond:    "bg-purple-100 text-purple-800 border-purple-200",
  goedgekeurd: "bg-emerald-100 text-emerald-800 border-emerald-200",
  geannuleerd: "bg-gray-100 text-gray-600 border-gray-200",
};