import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentBranch, applyBranchFilter, BRANCH_LABELS, type BranchFilter } from "@/contexts/BranchContext";
import BranchFilter_UI from "@/components/reports/BranchFilter";
import {
  Shield, Wrench, PaintBucket, Hammer, ClipboardCheck, Truck, Inbox,
  Loader2, ChevronRight, Clock, User as UserIcon, CheckCircle2, AlertCircle,
} from "lucide-react";
import { differenceInHours, differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  description: string;
  assignee?: string;
  status: string;
  ageDays?: number;
}
interface DeliveryLine {
  id: string;
  vehicle: string;
  license?: string;
  when: "vandaag" | "morgen";
  ready: boolean;
  missing: string;
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

const dot = (sev: "green" | "orange" | "red") =>
  sev === "red" ? "bg-red-500" : sev === "orange" ? "bg-orange-500" : "bg-emerald-500";

const vehicleLabel = (v: any) =>
  v ? `${v.brand || ""} ${v.model || ""}${v.license_number ? ` (${v.license_number})` : ""}`.trim() : "Onbekend voertuig";

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
        .select("id, discipline, status, description, vehicle_id, assigned_to, is_rush, sort_order, created_at, started_at, finished_at, vehicles:vehicle_id(brand, model, license_number)"),
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
    description: w.description || "—",
    assignee: w.assigned_to ? profileMap.get(w.assigned_to) : undefined,
    status: w.status,
    ageDays: w.created_at ? differenceInDays(now, new Date(w.created_at)) : undefined,
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
    .select("id, brand, model, license_number, delivery_date, import_status, details")
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
      when: v.delivery_date === iso(today) ? "vandaag" : "morgen",
      ready,
      missing: ready ? "Gereed voor aflevering" : bits.join(" · "),
    };
  });

  // 7) Inname
  let iq = supabase
    .from("vehicle_intakes")
    .select("id, vehicle_id, created_at, vehicles:vehicle_id(brand, model, license_number)")
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
      description: `${differenceInHours(now, new Date(i.created_at))}u binnengemeld`,
      status: "open",
    })),
  };
}

/* ------- Building blocks ------- */

const Block: React.FC<{
  icon: React.ReactNode;
  title: string;
  count: number;
  onClick?: () => void;
  accent?: string;
  children?: React.ReactNode;
  emptyLabel?: string;
}> = ({ icon, title, count, onClick, accent, children, emptyLabel }) => (
  <Card
    className={cn(
      "border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
      accent
    )}
    onClick={onClick}
  >
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-muted text-foreground/70">{icon}</div>
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </CardTitle>
        </div>
        <div className="text-2xl font-bold leading-none tabular-nums">{count}</div>
      </div>
    </CardHeader>
    <CardContent className="pt-1">
      {children ?? (
        <div className="text-xs text-muted-foreground py-2">{emptyLabel || "Geen items"}</div>
      )}
    </CardContent>
  </Card>
);

const Row: React.FC<{
  onClick?: (e: React.MouseEvent) => void;
  left: React.ReactNode;
  right?: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ onClick, left, right, sub }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick?.(e);
    }}
    className="w-full text-left group flex items-start justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0 hover:bg-muted/40 rounded px-1 -mx-1 transition-colors"
  >
    <div className="min-w-0 flex-1">
      <div className="text-sm truncate">{left}</div>
      {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
    </div>
    <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
      {right}
      <ChevronRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-80" />
    </div>
  </button>
);

/* ------- Page ------- */

const WerkplaatsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branchFilter, userBranch } = useCurrentBranch();
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCockpit(branchFilter)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
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

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {greeting}, {displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })} · {branchLabel}
            </p>
          </div>
          <BranchFilter_UI />
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cockpit laden…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Garantie */}
          <Block
            icon={<Shield className="h-4 w-4" />}
            title="Openstaande garantie"
            count={data.warrantyOpen}
            onClick={() => navigate("/warranty")}
            emptyLabel="Geen wachtende garantie-mails"
          >
            {data.waitingThreads.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">
                Geen wachtende garantie-mails.
              </div>
            ) : (
              <div className="space-y-0">
                {data.waitingThreads.map((t) => (
                  <Row
                    key={t.id}
                    onClick={() => navigate("/warranty")}
                    left={
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", dot(t.severity))} />
                        <span className="font-medium">{t.klant}</span>
                      </div>
                    }
                    sub={t.onderwerp}
                    right={<span className="tabular-nums">{t.hours}u</span>}
                  />
                ))}
              </div>
            )}
          </Block>

          {/* Werkplaats */}
          <Block
            icon={<Wrench className="h-4 w-4" />}
            title="Werkplaats open"
            count={data.wpOpen}
            onClick={() => navigate("/werkplaats/planning")}
            emptyLabel="Geen open werkplaats-orders"
          >
            {data.wpBezig.length > 0 && (
              <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Nu bezig
              </div>
            )}
            {data.wpBezig.map((l) => (
              <Row
                key={l.id}
                onClick={() => navigate("/werkplaats/planning")}
                left={<span className="font-medium">{l.vehicle}</span>}
                sub={l.description}
                right={
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {l.assignee || "—"}
                  </span>
                }
              />
            ))}
            {data.wpLines.length > 0 && data.wpBezig.length > 0 && (
              <div className="mt-2 mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Ingepland
              </div>
            )}
            {data.wpLines.map((l) => (
              <Row
                key={l.id}
                onClick={() => navigate("/werkplaats/planning")}
                left={<span className="font-medium">{l.vehicle}</span>}
                sub={l.description}
                right={l.assignee || "—"}
              />
            ))}
          </Block>

          {/* Schadeherstel */}
          <Block
            icon={<PaintBucket className="h-4 w-4" />}
            title="Schadeherstel open"
            count={data.spuitOpen}
            onClick={() => navigate("/werkplaats/planning")}
            emptyLabel="Geen open spuit-orders"
          >
            {data.spuitBezig.length > 0 && (
              <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Nu bezig
              </div>
            )}
            {data.spuitBezig.map((l) => (
              <Row
                key={l.id}
                onClick={() => navigate("/werkplaats/planning")}
                left={<span className="font-medium">{l.vehicle}</span>}
                sub={l.description}
                right={
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {l.assignee || "—"}
                  </span>
                }
              />
            ))}
            {data.spuitLines.length > 0 && data.spuitBezig.length > 0 && (
              <div className="mt-2 mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Ingepland
              </div>
            )}
            {data.spuitLines.map((l) => (
              <Row
                key={l.id}
                onClick={() => navigate("/werkplaats/planning")}
                left={<span className="font-medium">{l.vehicle}</span>}
                sub={l.description}
                right={l.assignee || "—"}
              />
            ))}
          </Block>

          {/* Uitdeuken */}
          <Block
            icon={<Hammer className="h-4 w-4" />}
            title="Uitdeuken"
            count={data.uitdeukOpen}
            onClick={() => navigate("/werkplaats/uitdeuken")}
            emptyLabel="Geen open uitdeuk-orders"
          >
            {data.uitdeukLongest && (
              <Row
                onClick={() => navigate("/werkplaats/uitdeuken")}
                left={<span className="font-medium">{data.uitdeukLongest.vehicle}</span>}
                sub={data.uitdeukLongest.description}
                right={
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {data.uitdeukLongest.ageDays ?? 0}d
                  </span>
                }
              />
            )}
          </Block>

          {/* Goedkeuring */}
          <Block
            icon={<ClipboardCheck className="h-4 w-4" />}
            title="Wacht op goedkeuring"
            count={data.waitApproval}
            onClick={() => navigate("/werkplaats/goedkeuren")}
            accent={data.waitApproval > 0 ? "ring-1 ring-orange-200" : undefined}
            emptyLabel="Niets te controleren"
          >
            {data.approvalLines.map((l) => (
              <Row
                key={l.id}
                onClick={() => navigate("/werkplaats/goedkeuren")}
                left={
                  <span>
                    <span className="font-medium">{l.vehicle}</span>{" "}
                    <span className="text-muted-foreground">— afgerond door {l.assignee || "onbekend"}</span>
                  </span>
                }
                sub={l.description}
                right={
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {l.ageDays ?? 0}d
                  </span>
                }
              />
            ))}
          </Block>

          {/* Afleveringen */}
          <Block
            icon={<Truck className="h-4 w-4" />}
            title="Afleveringen vandaag & morgen"
            count={data.deliveries.length}
            onClick={() => navigate("/inventory/consumer")}
            emptyLabel="Geen afleveringen gepland"
          >
            {data.deliveries.map((d) => (
              <Row
                key={d.id}
                onClick={() => navigate("/inventory/consumer")}
                left={
                  <div className="flex items-center gap-2">
                    {d.ready ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                    )}
                    <span className="font-medium">
                      {d.vehicle}
                      {d.license ? ` · ${d.license}` : ""}
                    </span>
                  </div>
                }
                sub={d.missing}
                right={
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] uppercase font-medium",
                      d.when === "vandaag"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                    )}
                  >
                    {d.when}
                  </span>
                }
              />
            ))}
          </Block>

          {/* Inname */}
          <Block
            icon={<Inbox className="h-4 w-4" />}
            title="Inname te doen"
            count={data.intakeOpen}
            onClick={() => navigate("/werkplaats/inname")}
            emptyLabel="Geen open innames"
          >
            {data.intakeLines.map((l) => (
              <Row
                key={l.id}
                onClick={() => navigate("/werkplaats/inname")}
                left={<span className="font-medium">{l.vehicle}</span>}
                sub={l.description}
              />
            ))}
          </Block>
        </div>
      )}
    </DashboardLayout>
  );
};

export default WerkplaatsDashboard;