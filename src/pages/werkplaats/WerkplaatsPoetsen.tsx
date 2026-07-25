import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { toast } from "@/hooks/use-toast";
import { Loader2, Truck, Home, CheckCircle2, Sparkles } from "lucide-react";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { nl } from "date-fns/locale";
import { AsPage, AsCard, AsCardHead, AsLicensePlate } from "@/components/aftersales/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PoetsWO {
  id: string;
  description: string;
  status: string;
  poets_type: string | null;
  due_date: string | null;
  created_at: string;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    license_number: string | null;
  } | null;
}

const deadlineTone = (due: string | null): "red" | "amber" | "slate" => {
  if (!due) return "slate";
  const d = new Date(due);
  if (isPast(d) && !isToday(d)) return "red";
  if (isToday(d)) return "red";
  if (isTomorrow(d)) return "amber";
  return "slate";
};

const PoetsCard: React.FC<{ w: PoetsWO; onDone: (w: PoetsWO) => void; showDeadline: boolean }> = ({ w, onDone, showDeadline }) => {
  const tone = deadlineTone(w.due_date);
  const toneCls =
    tone === "red" ? "bg-red-50 text-red-700 border-red-200"
    : tone === "amber" ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <AsLicensePlate value={w.vehicle?.license_number} size="sm" />
        <span className="text-[14px] font-bold text-slate-900 truncate">{w.vehicle?.brand} {w.vehicle?.model}</span>
      </div>
      {showDeadline && w.due_date && (
        <div className={cn("inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-md border text-[12.5px] font-semibold", toneCls)}>
          Klaar vóór {format(new Date(w.due_date), "EEE d MMM", { locale: nl })}
        </div>
      )}
      <div className="text-[13px] text-slate-700 whitespace-pre-wrap">{w.description || "—"}</div>
      <Button
        onClick={() => onDone(w)}
        className="h-12 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[15px] font-semibold"
      >
        <CheckCircle2 className="h-5 w-5 mr-2" /> Schoon
      </Button>
    </div>
  );
};

const WerkplaatsPoetsen: React.FC = () => {
  const { branchFilter } = useCurrentBranch();
  const [rows, setRows] = useState<PoetsWO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("work_orders")
      .select("id, description, status, poets_type, due_date, created_at, vehicle:vehicles!work_orders_vehicle_id_fkey(id, brand, model, license_number)")
      .eq("discipline", "poets")
      .in("status", ["ingepland", "bezig"]);
    q = applyBranchFilter(q as any, branchFilter);
    const { data, error } = await q;
    if (error) toast({ title: "Fout bij laden", description: error.message, variant: "destructive" });
    setRows(((data as any) || []) as PoetsWO[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [branchFilter]);

  const { afleveringen, showroom } = useMemo(() => {
    const afl = rows.filter(r => r.poets_type === "aflevering")
      .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
    const sh = rows.filter(r => r.poets_type !== "aflevering")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { afleveringen: afl, showroom: sh };
  }, [rows]);

  const markDone = async (w: PoetsWO) => {
    setRows(prev => prev.filter(r => r.id !== w.id));
    const { error } = await supabase.from("work_orders")
      .update({ status: "goedgekeurd", finished_at: new Date().toISOString(), approved_at: new Date().toISOString() })
      .eq("id", w.id);
    if (error) {
      toast({ title: "Kon niet opslaan", description: error.message, variant: "destructive" });
      load();
      return;
    }
    toast({ title: "✓ Schoon", description: `${w.vehicle?.brand ?? ""} ${w.vehicle?.model ?? ""}`.trim() });
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Poetsen</h1>
            <p className="text-[13px] text-slate-500 mt-1">Tik op ✓ Schoon zodra de auto klaar is</p>
          </div>
          <BranchFilter />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </div>
        ) : rows.length === 0 ? (
          <AsCard className="p-12 text-center">
            <Sparkles className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <div className="text-[16px] font-semibold text-slate-800">Alles schoon 💪</div>
            <div className="text-[13px] text-slate-500 mt-1">Geen open poets-taken.</div>
          </AsCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AsCard className="flex flex-col">
              <AsCardHead
                tone="blue"
                icon={<Truck className="h-4 w-4" />}
                title="Afleveringen"
                subtitle="Op deadline"
                count={afleveringen.length}
              />
              <div className="flex flex-col gap-3 p-3">
                {afleveringen.length === 0 ? (
                  <div className="text-[12.5px] text-slate-400 px-1 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                    Geen afleveringen.
                  </div>
                ) : afleveringen.map(w => (
                  <PoetsCard key={w.id} w={w} onDone={markDone} showDeadline />
                ))}
              </div>
            </AsCard>

            <AsCard className="flex flex-col">
              <AsCardHead
                tone="slate"
                icon={<Home className="h-4 w-4" />}
                title="Showroom"
                subtitle="Op ouderdom"
                count={showroom.length}
              />
              <div className="flex flex-col gap-3 p-3">
                {showroom.length === 0 ? (
                  <div className="text-[12.5px] text-slate-400 px-1 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                    Geen showroom-taken.
                  </div>
                ) : showroom.map(w => (
                  <PoetsCard key={w.id} w={w} onDone={markDone} showDeadline={false} />
                ))}
              </div>
            </AsCard>
          </div>
        )}
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsPoetsen;