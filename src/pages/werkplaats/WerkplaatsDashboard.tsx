import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentBranch, applyBranchFilter, BRANCH_LABELS, type BranchFilter } from "@/contexts/BranchContext";
import BranchFilter_UI from "@/components/reports/BranchFilter";
import {
  Shield, Wrench, PaintBucket, Hammer, ClipboardCheck, Truck, Inbox,
  Loader2, ChevronRight, Clock, CheckCircle2, AlertCircle, AlarmClock, Activity, ArrowRight,
} from "lucide-react";
import { differenceInHours, differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AsPage, AsCard, AsPill, AsDot, AsVehicleThumb, AsMono, AsCardHead, AsCardFoot, fmtWait, useLiveTimer } from "@/components/aftersales/ui";

interface WaitingThread {
  id: string;
  klant: string;
  onderwerp: string;
  hours: number;
  severity: "green" | "orange" | "red";
}
interface WoLine {
  id: string;
  vehicle: string;
  vehicleId?: string;
  photo?: string | null;
  license?: string | null;
  vin?: string | null;
  description: string;
  assignee?: string;
  status: string;
  ageDays?: number;
  startedAt?: string | null;
}
interface DeliveryLine {
  id: string;
  vehicle: string;
  license?: string;
  vin?: string | null;
  photo?: string | null;
  time?: string | null;
  customer?: string | null;
  when: "vandaag" | "morgen";
  ready: boolean;
  missing: string;
  bits: string[];
}

interface CockpitData {
  warrantyOpen: number;
  waitingThreads: WaitingThread[];
  wpOpen: number;
  wpLines: WoLine[];
  wpBezig: WoLine[];
  spuitOpen: number;
  spuitLines: WoLine[];
  spuitBezig: WoLine[];
  uitdeukOpen: number;
  uitdeukLongest?: WoLine;
  waitApproval: number;
  approvalLines: WoLine[];
  deliveries: DeliveryLine[];
  intakeOpen: number;
  intakeLines: WoLine[];
}

const vehicleLabel = (v: any) =>
  v ? `${v.brand || ""} ${v.model || ""}`.trim() : "Onbekend voertuig";

async function loadCockpit(branch: BranchFilter): Promise<CockpitData> {
  const now = new Date();

  // 1) Garantie
  const { data: threads } = await supabase
    .from("garantie_email_threads")
    .select("id, klant_naam, klant_email, onderwerp, laatste_email_op, thread_status")
    .neq("thread_status", "gesloten")
    .order("laatste_email_op", { ascending: false })
    .limit(30);

  const waitingThreads: WaitingThread[] = [];
  for (const t of ((threads as any[]) || [])) {
    const { data: last } = await supabase
      .from("garantie_emails")
      .select("richting, received_at")
      .eq("thread_id", t.id)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last || (last as any).richting !== "inkomend") continue;
    const hours = differenceInHours(now, new Date((last as any).received_at));
    const sev: "green" | "orange" | "red" = hours > 20 ? "red" : hours >= 12 ? "orange" : "green";
    waitingThreads.push({
      id: t.id,
      klant: t.klant_naam || t.klant_email,
      onderwerp: t.onderwerp || "(geen onderwerp)",
      hours,
      severity: sev,
    });
  }
  waitingThreads.sort((a, b) => b.hours - a.hours);

  let wcq = supabase
    .from("warranty_claims")
    .select("id", { count: "exact", head: true })
    .in("claim_status", ["pending", "actief", "in_behandeling", "open"]);
  wcq = applyBranchFilter(wcq, branch);
  const { count: warrantyOpen } = await wcq;

  // 2 + 3 + 4 + 5) Werkorders
  const woBase = () =>
    applyBranchFilter(
      supabase
        .from("work_orders")
        .select("id, discipline, status, description, vehicle_id, assigned_to, is_rush, sort_order, created_at, started_at, finished_at, work_seconds, vehicles:vehicle_id(brand, model, license_number, vin, showroom_photo_url)"),
      branch
    );

  const [wpOpenRes, wpBezigRes, spuitOpenRes, spuitBezigRes, uitdeukRes, approvalRes, assigneeProfilesRes] = await Promise.all([
    woBase().eq("discipline", "werkplaats").in("status", ["aangevraagd", "ingepland"]).order("sort_order", { ascending: true }).limit(20),
    woBase().eq("discipline", "werkplaats").eq("status", "bezig").limit(20),
    woBase().eq("discipline", "spuit").in("status", ["aangevraagd", "ingepland"]).order("sort_order", { ascending: true }).limit(20),
    woBase().eq("discipline", "spuit").eq("status", "bezig").limit(20),
    woBase().eq("discipline", "uitdeuk").in("status", ["aangevraagd", "ingepland", "bezig"]).order("created_at", { ascending: true }).limit(50),
    woBase().eq("status", "afgerond").order("finished_at", { ascending: true }).limit(20),
    supabase.from("profiles").select("id, first_name, last_name"),
  ]);

  const profileMap = new Map<string, string>();
  for (const p of ((assigneeProfilesRes.data as any[]) || [])) {
    profileMap.set(p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend");
  }

  const toLine = (w: any): WoLine => ({
    id: w.id,
    vehicle: vehicleLabel(w.vehicles),
    vehicleId: w.vehicle_id,
    photo: w.vehicles?.showroom_photo_url || null,
    license: w.vehicles?.license_number || null,
    vin: w.vehicles?.vin || null,
    description: w.description || "—",
    assignee: w.assigned_to ? profileMap.get(w.assigned_to) : undefined,
    status: w.status,
    ageDays: w.created_at ? differenceInDays(now, new Date(w.created_at)) : undefined,
    startedAt: w.started_at || null,
  });

  const wpOpen = (wpOpenRes.data as any[]) || [];
  const wpBezig = (wpBezigRes.data as any[]) || [];
  const spuitOpen = (spuitOpenRes.data as any[]) || [];
  const spuitBezig = (spuitBezigRes.data as any[]) || [];
  const uitdeukArr = (uitdeukRes.data as any[]) || [];
  const approvals = (approvalRes.data as any[]) || [];

  const uitdeukLongest = uitdeukArr[0] ? toLine(uitdeukArr[0]) : undefined;

  // 6) Afleveringen vandaag/morgen
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  let dq = supabase
    .from("vehicles")
    .select("id, brand, model, license_number, vin, showroom_photo_url, delivery_date, import_status, details")
    .eq("status", "verkocht_b2c")
    .in("delivery_date", [iso(today), iso(tomorrow)])
    .order("delivery_date", { ascending: true });
  dq = applyBranchFilter(dq, branch);
  const { data: dv } = await dq;

  // open werkorders per voertuig (voor deze delivery-lijst)
  const dvIds = ((dv as any[]) || []).map((v) => v.id);
  const openWoMap = new Map<string, number>();
  if (dvIds.length) {
    const { data: openW } = await supabase
      .from("work_orders")
      .select("vehicle_id")
      .in("vehicle_id", dvIds)
      .not("status", "in", "(goedgekeurd,geannuleerd)");
    for (const w of ((openW as any[]) || [])) {
      openWoMap.set(w.vehicle_id, (openWoMap.get(w.vehicle_id) || 0) + 1);
    }
  }

  const deliveries: DeliveryLine[] = ((dv as any[]) || []).map((v) => {
    const details = v.details || {};
    const cl = details.preDeliveryChecklist || [];
    const total = Array.isArray(cl) ? cl.length : 0;
    const done = Array.isArray(cl) ? cl.filter((i: any) => i.completed === true).length : 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const openWo = openWoMap.get(v.id) || 0;
    const ready = pct === 100 && v.import_status === "ingeschreven" && openWo === 0;
    const bits: string[] = [];
    if (pct < 100) bits.push(`checklist ${pct}%`);
    if (v.import_status !== "ingeschreven") bits.push("nog niet ingeschreven");
    if (openWo > 0) bits.push(`${openWo} werkorder${openWo > 1 ? "s" : ""} open`);
    return {
      id: v.id,
      vehicle: `${v.brand} ${v.model}`,
      license: v.license_number,
      vin: v.vin || null,
      photo: v.showroom_photo_url || null,
      time: details.deliveryTime || null,
      customer: details.customerName || null,
      when: v.delivery_date === iso(today) ? "vandaag" : "morgen",
      ready,
      missing: ready ? "Gereed voor aflevering" : bits.join(" · "),
      bits,
    };
  });

  // 7) Inname
  let iq = supabase
    .from("vehicle_intakes")
    .select("id, vehicle_id, created_at, vehicles:vehicle_id(brand, model, license_number, vin, showroom_photo_url)")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(20);
  iq = applyBranchFilter(iq, branch);
  const { data: intakes } = await iq;

  return {
    warrantyOpen: warrantyOpen || 0,
    waitingThreads: waitingThreads.slice(0, 3),
    wpOpen: wpOpen.length + wpBezig.length,
    wpLines: wpOpen.slice(0, 3).map(toLine),
    wpBezig: wpBezig.slice(0, 3).map(toLine),
    spuitOpen: spuitOpen.length + spuitBezig.length,
    spuitLines: spuitOpen.slice(0, 3).map(toLine),
    spuitBezig: spuitBezig.slice(0, 3).map(toLine),
    uitdeukOpen: uitdeukArr.length,
    uitdeukLongest,
    waitApproval: approvals.length,
    approvalLines: approvals.slice(0, 3).map((a) => ({
      ...toLine(a),
      ageDays: a.finished_at ? differenceInDays(now, new Date(a.finished_at)) : 0,
    })),
    deliveries,
    intakeOpen: ((intakes as any[]) || []).length,
    intakeLines: ((intakes as any[]) || []).slice(0, 3).map((i: any) => ({
      id: i.id,
      vehicle: vehicleLabel(i.vehicles),
      license: i.vehicles?.license_number || null,
      vin: i.vehicles?.vin || null,
      photo: i.vehicles?.showroom_photo_url || null,
      description: `${differenceInHours(now, new Date(i.created_at))}u binnengemeld`,
      status: "open",
    })),
  };
}


/* ================= Aftersales-only cockpit UI ================= */

const KpiChip: React.FC<{ label: string; value: number | string; tone?: "slate" | "red" | "violet"; icon?: React.ReactNode }> = ({ label, value, tone = "slate", icon }) => {
  const map: Record<string, string> = {
    slate: "bg-white border-slate-200 text-slate-900",
    red: "bg-white border-red-200 text-red-700",
    violet: "bg-white border-violet-200 text-violet-700",
  };
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-sm", map[tone])}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-lg font-semibold tabular-nums flex items-center gap-1.5">
        {icon}{value}
      </div>
    </div>
  );
};

const VehicleLine: React.FC<{
  photo?: string | null;
  title: string;
  license?: string | null;
  vin?: string | null;
  meta?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
}> = ({ photo, title, license, vin, meta, right, onClick }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    className="w-full text-left group flex items-center gap-3 py-2.5 px-4 hover:bg-slate-50 transition-colors border-t border-slate-100 first:border-t-0"
  >
    <AsVehicleThumb src={photo} className="h-11 w-16" />
    <div className="min-w-0 flex-1">
      <div className="text-[13px] font-semibold text-slate-900 truncate">{title}</div>
      <div className="text-[12px] text-slate-500 truncate flex items-center gap-2">
        {license && <AsMono className="text-slate-700">{license}</AsMono>}
        {vin && <AsMono>· {vin.slice(-8)}</AsMono>}
      </div>
      {meta && <div className="text-[12px] text-slate-600 mt-0.5 truncate">{meta}</div>}
    </div>
    <div className="shrink-0 flex items-center gap-2">{right}<ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" /></div>
  </button>
);

const LiveTimerPill: React.FC<{ started?: string | null; tone?: "violet" }> = ({ started }) => {
  const t = useLiveTimer(started);
  if (!t) return null;
  return <AsPill tone="violet"><Activity className="h-3 w-3" />{t}</AsPill>;
};

const CardFooter = AsCardFoot;

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="px-4 py-6 text-center text-[12px] text-slate-400">{text}</div>
);

/* ================= Page ================= */

const WerkplaatsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branchFilter } = useCurrentBranch();
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCockpit(branchFilter)
      .then((d) => { if (!cancelled) setData(d); })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [branchFilter]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Goedemorgen";
    if (h < 18) return "Goedemiddag";
    return "Goedenavond";
  }, []);

  const displayName =
    (user?.user_metadata as any)?.first_name ||
    (user?.email || "").split("@")[0] ||
    "collega";
  const branchLabel =
    branchFilter === "all"
      ? "Alle vestigingen"
      : BRANCH_LABELS[branchFilter as keyof typeof BRANCH_LABELS];

  const busyCount = data ? data.wpBezig.length + data.spuitBezig.length : 0;
  const warrantyRed = data ? data.waitingThreads.filter((t) => t.severity === "red").length : 0;
  const totalOpen = data ? data.wpOpen + data.spuitOpen + data.uitdeukOpen : 0;

  return (
    <DashboardLayout>
      <AsPage>
        {/* Hero */}
        <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
          <div>
            <h1 className="text-2xl md:text-[26px] font-semibold tracking-tight text-slate-900">
              {greeting}, {displayName} <span className="ml-1">👋</span>
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })} · {branchLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <KpiChip label="Open werkorders" value={totalOpen} />
            <KpiChip label="Nu bezig" value={busyCount} tone="violet" icon={<Activity className="h-4 w-4" />} />
            <KpiChip label="Mails >20u" value={warrantyRed} tone={warrantyRed > 0 ? "red" : "slate"} icon={<AlarmClock className="h-4 w-4" />} />
            <BranchFilter_UI />
          </div>
        </div>

        {loading || !data ? (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Cockpit laden…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min">
            {/* Afleveringen — span 7 */}
            <AsCard className="md:col-span-7 overflow-hidden">
              <AsCardHead
                tone="blue"
                icon={<Truck className="h-4 w-4" />}
                title="Afleveringen vandaag & morgen"
                subtitle="Gereedheid per auto — checklist · inschrijving · open werkorders"
                count={data.deliveries.length}
              />
              {data.deliveries.length === 0 ? (
                <EmptyState text="Geen afleveringen gepland voor vandaag of morgen." />
              ) : (
                <div>
                  {data.deliveries.map((d) => (
                    <VehicleLine
                      key={d.id}
                      photo={d.photo}
                      title={d.vehicle}
                      license={d.license}
                      vin={d.vin}
                      meta={
                        <span className="flex items-center gap-2 flex-wrap">
                          <AsPill tone={d.when === "vandaag" ? "blue" : "slate"}>{d.when}{d.time ? ` · ${d.time}` : ""}</AsPill>
                          {d.customer && <span className="text-slate-600">{d.customer}</span>}
                        </span>
                      }
                      right={
                        d.ready ? (
                          <AsPill tone="green"><CheckCircle2 className="h-3 w-3" />Gereed voor levering</AsPill>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap justify-end max-w-[280px]">
                            {d.bits.map((b, i) => (
                              <AsPill key={i} tone={b.includes("checklist") && !b.includes("100") ? "amber" : "red"}>{b}</AsPill>
                            ))}
                          </div>
                        )
                      }
                      onClick={() => navigate("/inventory/consumer")}
                    />
                  ))}
                </div>
              )}
              <AsCardFoot label="Alle geplande afleveringen →" onClick={() => navigate("/inventory/consumer")} />
            </AsCard>

            {/* Garantie — span 5 */}
            <AsCard className="md:col-span-5 overflow-hidden">
              <AsCardHead
                tone="red"
                icon={<Shield className="h-4 w-4" />}
                title="Openstaande mails"
                subtitle="garantie@auto-city.nl · 24-uurs opvolgregel"
                count={data.waitingThreads.length}
                right={warrantyRed > 0 ? <AsPill tone="red"><AlarmClock className="h-3 w-3" />{warrantyRed} deadline</AsPill> : null}
              />
              {data.waitingThreads.length === 0 ? (
                <EmptyState text="Geen wachtende garantie-mails." />
              ) : (
                <div>
                  {data.waitingThreads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate("/garantie/inbox")}
                      className="w-full text-left group flex items-start gap-3 px-4 py-2.5 border-t border-slate-100 first:border-t-0 hover:bg-slate-50 transition-colors"
                    >
                      <AsDot tone={t.severity === "red" ? "red" : t.severity === "orange" ? "amber" : "green"} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">{t.klant}</div>
                        <div className="text-[12px] text-slate-500 truncate">{t.onderwerp}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={cn("text-[12px] font-semibold tabular-nums", t.severity === "red" ? "text-red-600" : t.severity === "orange" ? "text-amber-700" : "text-slate-500")}>
                          {t.severity === "red" && "⏰ "}{fmtWait(t.hours)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <AsCardFoot label="Open de inbox →" onClick={() => navigate("/garantie/inbox")} />
            </AsCard>

            {/* Werkplaats — span 4 */}
            <AsCard className="md:col-span-4 overflow-hidden">
              <AsCardHead tone="blue" icon={<Wrench className="h-4 w-4" />} title="Werkplaats" subtitle="Monteurs · wachtrij & bezig" count={data.wpOpen} />
              {data.wpBezig[0] ? (
                <div className="px-4 py-3 border-t border-slate-100 bg-violet-50/40">
                  <div className="text-[11px] uppercase tracking-wide text-violet-700 font-semibold mb-1">Nu bezig</div>
                  <div className="flex items-center gap-3">
                    <AsVehicleThumb src={data.wpBezig[0].photo} className="h-10 w-14" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold truncate">{data.wpBezig[0].vehicle}</div>
                      <div className="text-[12px] text-slate-500 truncate">{data.wpBezig[0].assignee || "—"} · {data.wpBezig[0].description}</div>
                    </div>
                    <LiveTimerPill started={data.wpBezig[0].startedAt} />
                  </div>
                </div>
              ) : null}
              {data.wpLines[0] ? (
                <VehicleLine
                  photo={data.wpLines[0].photo}
                  title={data.wpLines[0].vehicle}
                  license={data.wpLines[0].license}
                  meta={data.wpLines[0].description}
                  right={<AsPill tone="slate">wachtrij</AsPill>}
                  onClick={() => navigate("/werkplaats/planning")}
                />
              ) : (!data.wpBezig[0] && <EmptyState text="Geen open werkplaats-orders." />)}
              <AsCardFoot label="Naar planning →" onClick={() => navigate("/werkplaats/planning")} />
            </AsCard>

            {/* Schadeherstel — span 4 */}
            <AsCard className="md:col-span-4 overflow-hidden">
              <AsCardHead tone="violet" icon={<PaintBucket className="h-4 w-4" />} title="Schadeherstel" subtitle="Spuiterij · wachtrij & bezig" count={data.spuitOpen} />
              {data.spuitBezig[0] ? (
                <div className="px-4 py-3 border-t border-slate-100 bg-violet-50/40">
                  <div className="text-[11px] uppercase tracking-wide text-violet-700 font-semibold mb-1">Nu bezig</div>
                  <div className="flex items-center gap-3">
                    <AsVehicleThumb src={data.spuitBezig[0].photo} className="h-10 w-14" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold truncate">{data.spuitBezig[0].vehicle}</div>
                      <div className="text-[12px] text-slate-500 truncate">{data.spuitBezig[0].assignee || "—"} · {data.spuitBezig[0].description}</div>
                    </div>
                    <LiveTimerPill started={data.spuitBezig[0].startedAt} />
                  </div>
                </div>
              ) : null}
              {data.spuitLines[0] ? (
                <VehicleLine
                  photo={data.spuitLines[0].photo}
                  title={data.spuitLines[0].vehicle}
                  license={data.spuitLines[0].license}
                  meta={data.spuitLines[0].description}
                  right={<AsPill tone="slate">wachtrij</AsPill>}
                  onClick={() => navigate("/werkplaats/planning")}
                />
              ) : (!data.spuitBezig[0] && <EmptyState text="Geen open spuit-orders." />)}
              <AsCardFoot label="Naar planning →" onClick={() => navigate("/werkplaats/planning")} />
            </AsCard>

            {/* Uitdeuken — span 4 */}
            <AsCard className="md:col-span-4 overflow-hidden">
              <AsCardHead tone="amber" icon={<Hammer className="h-4 w-4" />} title="Uitdeuken" subtitle="Extern · dagen-teller" count={data.uitdeukOpen} />
              {data.uitdeukLongest ? (
                <VehicleLine
                  photo={data.uitdeukLongest.photo}
                  title={data.uitdeukLongest.vehicle}
                  license={data.uitdeukLongest.license}
                  meta={data.uitdeukLongest.description}
                  right={
                    <AsPill tone={(data.uitdeukLongest.ageDays ?? 0) > 3 ? "red" : (data.uitdeukLongest.ageDays ?? 0) > 1 ? "amber" : "slate"}>
                      <Clock className="h-3 w-3" />{data.uitdeukLongest.ageDays ?? 0}d
                    </AsPill>
                  }
                  onClick={() => navigate("/werkplaats/uitdeuken")}
                />
              ) : (
                <EmptyState text="Geen open uitdeuk-orders." />
              )}
              <AsCardFoot label="Alle uitdeuk-orders →" onClick={() => navigate("/werkplaats/uitdeuken")} />
            </AsCard>

            {/* Goedkeuring — span 6 */}
            <AsCard className="md:col-span-6 overflow-hidden">
              <AsCardHead tone="teal" icon={<ClipboardCheck className="h-4 w-4" />} title="Wacht op jouw goedkeuring" subtitle="Afgeronde werkorders — controleer" count={data.waitApproval} />
              {data.approvalLines.length === 0 ? (
                <EmptyState text="Niets te controleren." />
              ) : (
                <div>
                  {data.approvalLines.map((l) => (
                    <VehicleLine
                      key={l.id}
                      photo={l.photo}
                      title={l.vehicle}
                      license={l.license}
                      meta={<span>door <span className="font-medium text-slate-700">{l.assignee || "onbekend"}</span> · {l.description}</span>}
                      right={
                        <>
                          <AsPill tone="amber"><Clock className="h-3 w-3" />{l.ageDays ?? 0}d</AsPill>
                          <AsPill tone="blue">controleer</AsPill>
                        </>
                      }
                      onClick={() => navigate("/werkplaats/goedkeuren")}
                    />
                  ))}
                </div>
              )}
              <AsCardFoot label="Alle goedkeuringen →" onClick={() => navigate("/werkplaats/goedkeuren")} />
            </AsCard>

            {/* Inname — span 6 */}
            <AsCard className="md:col-span-6 overflow-hidden">
              <AsCardHead tone="green" icon={<Inbox className="h-4 w-4" />} title="Inname te doen" subtitle="Binnengemelde auto's zonder inname" count={data.intakeOpen} />
              {data.intakeLines.length === 0 ? (
                <EmptyState text="Geen open innames." />
              ) : (
                <div>
                  {data.intakeLines.map((l) => (
                    <VehicleLine
                      key={l.id}
                      photo={l.photo}
                      title={l.vehicle}
                      license={l.license}
                      meta={l.description}
                      right={<AsPill tone="slate"><AlertCircle className="h-3 w-3" />open</AsPill>}
                      onClick={() => navigate("/werkplaats/inname")}
                    />
                  ))}
                </div>
              )}
              <AsCardFoot label="Alle innames →" onClick={() => navigate("/werkplaats/inname")} />
            </AsCard>
          </div>
        )}
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsDashboard;
