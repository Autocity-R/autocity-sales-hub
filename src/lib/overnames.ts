/** Overnames van werkorders (tabel work_order_overnames) → kort label op de planningskaart. */
export interface Overname {
  work_order_id: string;
  van_user_id: string | null;
  naar_user_id: string;
  overgenomen_op: string;
}

const NL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
const NL_TIME = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const NL_DM = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", day: "2-digit", month: "2-digit" });
const firstName = (n: string) => (n || "").trim().split(/\s+/)[0] || "Onbekend";

/** "Samsom → Dani (overgenomen 14:32)"; andere dag: "(overgenomen 14-11 14:32)". */
export function overnameLabel(list: Overname[] | undefined, nameOf: (id: string | null) => string, now: Date = new Date()): string | null {
  if (!list?.length) return null;
  const xs = [...list].sort((a, b) => +new Date(a.overgenomen_op) - +new Date(b.overgenomen_op));
  const chain = [firstName(nameOf(xs[0].van_user_id)), ...xs.map(o => firstName(nameOf(o.naar_user_id)))];
  const last = new Date(xs[xs.length - 1].overgenomen_op);
  const when = NL_DAY.format(last) === NL_DAY.format(now)
    ? NL_TIME.format(last)
    : `${NL_DM.format(last).replace("/", "-")} ${NL_TIME.format(last)}`;
  return `${chain.join(" → ")} (overgenomen ${when})`;
}
