import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Layers, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AsLicensePlate, AsPill } from "@/components/aftersales/ui";
import { WorkshopPhoto } from "@/components/werkplaats/WorkshopPhoto";
import { eur, num, NoData } from "@/components/rapportages/RapportagesShell";
import { cleanDescription, linkedExternalInvoice, pendingInvoiceAmount, possibleDuplicates, suspiciousTimer, type OrderGroup } from "@/lib/performanceGroups";
import type { RapOrder, RapRaw } from "@/services/rapportageService";

type Vehicle = { brand: string | null; model: string | null; license_number: string | null } | undefined;
export type GOrder = RapOrder & { vehicle?: Vehicle };

const DISC: Record<string, string> = { spuit: "Spuiten", werkplaats: "Werkplaats", uitdeuk: "Uitdeuken", poets: "Poetsen" };
const SOURCE: Record<string, string> = { inname: "Inname", inname_auto: "Inname (automatisch)", checklist: "Checklist", aftersales: "Aftersales", garantie: "Garantie", extern: "Extern" };
const hrs = (s: number) => `${num(s / 3600, 1)} u`;
const dt = (iso?: string | null) => iso ? new Date(iso).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const partsOf = (o: { part: string | null; parts: any }) => {
  const p = Array.isArray(o.parts) ? o.parts.map((x: any) => typeof x === "string" ? x : x?.name || x?.part || x?.label).filter(Boolean) : [];
  return p.length ? p.join(", ") : (o.part || "Onbekend onderdeel");
};
const photoPaths = (p: any): string[] => Array.isArray(p) ? p.map((x: any) => typeof x === "string" ? x : x?.path || x?.url).filter(Boolean) : [];
const nParts = (g: OrderGroup<GOrder>) => g.orders.reduce((a, o) => a + (Array.isArray(o.parts) && o.parts.length ? o.parts.length : 1), 0);
export const isCounted = (o: RapOrder) => o.status === "goedgekeurd";

interface Props {
  raw: RapRaw;
  groups: OrderGroup<GOrder>[];
  revenue: Map<string, number>;
  nameOf: (id?: string | null) => string;
}

export const PerformanceGroupCards: React.FC<Props> = ({ raw, groups, revenue, nameOf }) => {
  const [open, setOpen] = React.useState<OrderGroup<GOrder> | null>(null);
  const openSiblings = (g: OrderGroup<GOrder>) => raw.orders.filter(o =>
    o.vehicle_id && o.vehicle_id === g.vehicle_id && o.discipline === g.discipline
    && !["afgerond", "goedgekeurd", "geannuleerd"].includes(o.status || "")
    && !g.orders.some(x => x.id === o.id));
  const blockingOrders = (g: OrderGroup<GOrder>) => raw.orders.filter(o =>
    o.vehicle_id && o.vehicle_id === g.vehicle_id && o.discipline === g.discipline
    && (o.origin || "intern") === "intern" && !["goedgekeurd", "geannuleerd"].includes(o.status || ""));

  return (
    <>
      <div className="space-y-2">
        {groups.length === 0 && <NoData label="Geen taken gevonden" />}
        {groups.map(g => {
          const v = g.orders[0].vehicle;
          const rev = g.orders.reduce((a, o) => a + (isCounted(o) ? revenue.get(o.id) || 0 : 0), 0);
          const pending = g.orders.reduce((a, o) => a + pendingInvoiceAmount(o, raw.invoices6m), 0);
          const notCounted = g.orders.filter(o => !isCounted(o)).length;
          const sib = openSiblings(g);
          const blockers = blockingOrders(g);
          const external = g.orders.some(o => o.origin === "extern");
          const externalOrder = g.orders.find(o => o.origin === "extern");
          const externalInvoice = externalOrder ? linkedExternalInvoice(externalOrder.id, raw.invoices6m) : null;
          return (
            <button key={g.key} type="button" onClick={() => setOpen(g)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-300 hover:bg-blue-50/30">
              <div className="flex items-center justify-between gap-2">
                <AsPill tone={g.discipline === "spuit" ? "pink" : "blue"}>
                  {DISC[g.discipline || ""] || g.discipline} · {nParts(g)} {nParts(g) === 1 ? "onderdeel" : "onderdelen"}
                </AsPill>
                <span className="text-[11px] font-semibold text-slate-500">{new Date(g.day).toLocaleDateString("nl-NL")}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <AsLicensePlate value={v?.license_number} size="sm" />
                <span className="truncate text-[12.5px] font-medium text-slate-800">{v?.brand} {v?.model}</span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-[12px] text-slate-600">
                {g.orders.map(o => <li key={o.id} className="truncate">• {partsOf(o)} <span className="text-slate-400">({o.status})</span></li>)}
              </ul>
              {sib.length > 0 && (
                <div className="mt-1 text-[11.5px] text-slate-500">
                  + {sib.length} nog open voor deze auto: {sib.map(s => `${partsOf(s)} (${s.status})`).join(", ")}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                <span className="inline-flex items-center gap-1 text-slate-600"><Clock className="h-3.5 w-3.5" />
                  {g.fairSeconds ? hrs(g.fairSeconds) : "geen tijd"}</span>
                {g.parallel && <span className="inline-flex items-center gap-1 text-blue-700"><Layers className="h-3.5 w-3.5" />{g.orders.length} onderdelen tegelijk getimed</span>}
                {g.suspicious.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />Timer liep door ({num(Math.max(...g.suspicious.map(s => s.hours)), 1)} u)
                  </span>
                )}
                {external && <AsPill tone="slate">Externe klus</AsPill>}
                {notCounted > 0 && <span className="text-slate-400">{notCounted} nog niet geteld</span>}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11.5px]">
                <span className="text-slate-500">Gefactureerd <b className="ml-1 tabular-nums text-slate-900">{eur(rev)}</b></span>
                {!external && <span className="text-slate-500">Nog te factureren <b className="ml-1 tabular-nums text-amber-700">{eur(pending)}</b></span>}
              </div>
              {!external && pending > 0 && g.discipline === "spuit" && blockers.length > 0 && (
                <div className="mt-1.5 text-[11px] leading-4 text-amber-700">
                  Factuur volgt zodra alle onderdelen van deze auto goedgekeurd zijn. Nog open: {blockers.map(partsOf).join(", ")}.
                </div>
              )}
              {external && <div className="mt-1.5 text-[11px] text-slate-500">{externalInvoice ? `Gekoppelde externe factuur · ${externalInvoice.status || "status onbekend"}` : "Externe factuur niet aan werkorder gekoppeld"}</div>}
            </button>
          );
        })}
      </div>
      <GroupDetailDialog raw={raw} group={open} onClose={() => setOpen(null)} revenue={revenue} nameOf={nameOf} />
    </>
  );
};

const GroupDetailDialog: React.FC<{
  raw: RapRaw; group: OrderGroup<GOrder> | null; onClose: () => void; revenue: Map<string, number>; nameOf: Props["nameOf"];
}> = ({ raw, group, onClose, revenue, nameOf }) => {
  const ids = group?.orders.map(o => o.id) || [];
  const { data, isLoading } = useQuery({
    queryKey: ["perf-group-detail", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("work_orders")
        .select("id,vehicle_id,discipline,part,parts,description,created_by,created_at,source,origin,external_customer,photos,result_photos,reject_note,finish_note,rejected_count,paused_seconds,started_at,finished_at,status,approved_by,approved_at,work_seconds")
        .in("id", ids);
      if (error) throw error;
      const rows = (data || []) as any[];
      // dubbel-check tegen alle orders van dit voertuig + discipline
      const v = rows[0]?.vehicle_id;
      let peers: any[] = rows;
      if (v) {
        const r = await supabase.from("work_orders").select("id,vehicle_id,discipline,part,description,created_at")
          .eq("vehicle_id", v).eq("discipline", rows[0].discipline);
        peers = r.data || rows;
      }
      return { rows, dups: possibleDuplicates(peers as any) };
    },
  });
  const v = group?.orders[0].vehicle;
  const total = group ? group.orders.reduce((a, o) => a + (isCounted(o) ? revenue.get(o.id) || 0 : 0), 0) : 0;
  const pendingTotal = group ? group.orders.reduce((a, o) => a + pendingInvoiceAmount(o, raw.invoices6m), 0) : 0;
  const blockers = group ? raw.orders.filter(o => o.vehicle_id === group.vehicle_id && o.discipline === group.discipline
    && (o.origin || "intern") === "intern" && !["goedgekeurd", "geannuleerd"].includes(o.status || "")) : [];
  const rows = (data?.rows || []).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));

  return (
    <Dialog open={!!group} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-10 text-left">
            <AsLicensePlate value={v?.license_number} size="sm" />
            <span>{v?.brand} {v?.model} · {DISC[group?.discipline || ""] || group?.discipline}</span>
          </DialogTitle>
        </DialogHeader>
        {isLoading && <div className="text-[12px] text-slate-500">laden…</div>}
        <div className="space-y-3">
          {rows.map(r => {
            const counted = isCounted(r);
            const rev = revenue.get(r.id) || 0;
            const pending = pendingInvoiceAmount(r, raw.invoices6m);
            const external = r.origin === "extern";
            const externalInvoice = external ? linkedExternalInvoice(r.id, raw.invoices6m) : null;
            const sus = suspiciousTimer(r);
            const before = photoPaths(r.photos), after = photoPaths(r.result_photos);
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 p-3 text-[12.5px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{partsOf(r)}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {data?.dups.has(r.id) && <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700"><Copy className="h-3 w-3" />mogelijk dubbel</span>}
                    <AsPill tone={counted ? "green" : "slate"}>{r.status}</AsPill>
                  </div>
                </div>
                {cleanDescription(r.description) && <p className="mt-1 whitespace-pre-line text-slate-700">{cleanDescription(r.description)}</p>}
                <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-2">
                  <Row k="Aangemaakt" v={`${nameOf(r.created_by)} · ${dt(r.created_at)}`} />
                  <Row k="Bron" v={SOURCE[r.source] || r.source || "—"} />
                  <Row k="Start / stop" v={`${dt(r.started_at)} → ${dt(r.finished_at)}`} />
                  <Row k="Gepauzeerd" v={r.paused_seconds ? `${Math.round(r.paused_seconds / 60)} min` : "—"} />
                  <Row k="Gewerkte tijd" v={r.work_seconds ? hrs(r.work_seconds) : "—"} />
                  <Row k="Goedgekeurd" v={r.approved_at ? `${nameOf(r.approved_by)} · ${dt(r.approved_at)}` : "—"} />
                  <Row k="Afgekeurd" v={r.rejected_count ? `${r.rejected_count}×${r.reject_note ? ` — ${r.reject_note}` : ""}` : "0×"} />
                  <Row k="Afrondnotitie" v={r.finish_note || "—"} />
                  <Row k="Gefactureerd" v={counted ? eur(rev) : "nog niet geteld"} strong />
                  {!external && <Row k="Nog te factureren" v={counted ? eur(pending) : "nog niet geteld"} strong />}
                </dl>
                {external && (
                  <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11.5px] text-slate-700">
                    <b>Externe klus.</b> {externalInvoice
                      ? (externalInvoice.status === "verstuurd" ? `Gekoppelde externe factuur · ${eur(rev)} gefactureerd.` : `Gekoppelde externe factuur · status ${externalInvoice.status || "onbekend"}.`)
                      : "Externe factuur niet aan werkorder gekoppeld."}
                  </div>
                )}
                {sus != null && <div className="mt-2 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"><AlertTriangle className="h-3 w-3" />Timer liep door ({num(sus, 1)} u)</div>}
                {(before.length > 0 || after.length > 0) && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[["Vóór", before], ["Na", after]].map(([l, ps]) => (ps as string[]).length > 0 && (
                      <div key={l as string}>
                        <div className="mb-1 text-[11px] font-semibold text-slate-500">{l as string}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(ps as string[]).map(p => <a key={p} onClick={async (e) => { e.preventDefault(); const { data } = await supabase.storage.from("workshop-photos").createSignedUrl(p, 3600); if (data?.signedUrl) window.open(data.signedUrl, "_blank"); }} href="#"><WorkshopPhoto path={p} className="h-16 w-16" /></a>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {group && (
          <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[13px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Groepstotaal · tijd <b>{hrs(group.fairSeconds)}</b>
              {group.parallel && <span className="text-slate-500"> (som timers {hrs(group.sumSeconds)}, overlap 1× geteld)</span>}</span>
              <span className="text-right"><span className="text-slate-500">Gefactureerd</span> <b>{eur(total)}</b>{!group.orders.some(o => o.origin === "extern") && <><br /><span className="text-slate-500">Nog te factureren</span> <b className="text-amber-700">{eur(pendingTotal)}</b></>}</span>
            </div>
            {!group.orders.some(o => o.origin === "extern") && pendingTotal > 0 && group.discipline === "spuit" && blockers.length > 0 && (
              <div className="mt-2 border-t border-slate-200 pt-2 text-[11.5px] text-amber-700">
                Factuur volgt zodra alle onderdelen van deze auto goedgekeurd zijn. Nog open: {blockers.map(partsOf).join(", ")}.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Row: React.FC<{ k: string; v: React.ReactNode; strong?: boolean }> = ({ k, v, strong }) => (
  <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">{k}</dt><dd className={strong ? "font-semibold text-slate-900" : "text-slate-800"}>{v}</dd></div>
);
