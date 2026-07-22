import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBranch, applyBranchFilter } from "@/contexts/BranchContext";
import BranchFilter from "@/components/reports/BranchFilter";
import { ClipboardList, Wrench, Sparkles, PaintBucket, CheckCheck, Loader2, Truck, PackageCheck } from "lucide-react";

interface Counts {
  inname: number;
  uitdeuk: number;
  spuit_open: number;
  spuit_bezig: number;
  werkplaats_open: number;
  werkplaats_bezig: number;
  wacht_goedkeuring: number;
  nog_klaarmaken: number;
  klaar_levering: number;
}

const Tile: React.FC<{ title: string; value: number; icon: React.ReactNode; hint?: string; onClick?: () => void; className?: string }> = ({ title, value, icon, hint, onClick, className }) => (
  <Card onClick={onClick} className={`cursor-pointer transition hover:shadow-md ${className ?? ""}`}>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">{icon}</div>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </CardContent>
  </Card>
);

const WerkplaatsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { branchFilter } = useCurrentBranch();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const b = branchFilter;

        const woBase = () => applyBranchFilter(supabase.from("work_orders").select("id, discipline, status, warranty_claim_id, vehicle_id, is_rush"), b);

        const [
          intakesRes,
          uitdeukRes,
          spuitOpenRes,
          spuitBezigRes,
          wpOpenRes,
          wpBezigRes,
          wachtGoedRes,
          soldRes,
          openWosSoldRes,
        ] = await Promise.all([
          applyBranchFilter(supabase.from("vehicle_intakes").select("id", { count: "exact", head: true }).eq("status", "open"), b),
          woBase().eq("discipline", "uitdeuk").in("status", ["ingepland", "bezig", "afgerond"]),
          woBase().eq("discipline", "spuit").eq("status", "ingepland"),
          woBase().eq("discipline", "spuit").eq("status", "bezig"),
          woBase().eq("discipline", "werkplaats").eq("status", "ingepland"),
          woBase().eq("discipline", "werkplaats").eq("status", "bezig"),
          woBase().eq("status", "afgerond"),
          applyBranchFilter(supabase.from("vehicles").select("id").eq("status", "verkocht_b2c"), b),
          woBase().in("status", ["aangevraagd", "ingepland", "bezig", "afgerond"]),
        ]);

        const soldIds = new Set(((soldRes.data as any[]) || []).map(v => v.id));
        const openWoVehicleIds = new Set(((openWosSoldRes.data as any[]) || []).map(w => w.vehicle_id));
        const nogKlaarmaken = [...soldIds].filter(id => openWoVehicleIds.has(id)).length;
        const klaarLevering = soldIds.size - nogKlaarmaken;

        setCounts({
          inname: (intakesRes as any).count ?? 0,
          uitdeuk: (uitdeukRes.data as any[])?.length ?? 0,
          spuit_open: (spuitOpenRes.data as any[])?.length ?? 0,
          spuit_bezig: (spuitBezigRes.data as any[])?.length ?? 0,
          werkplaats_open: (wpOpenRes.data as any[])?.length ?? 0,
          werkplaats_bezig: (wpBezigRes.data as any[])?.length ?? 0,
          wacht_goedkeuring: (wachtGoedRes.data as any[])?.length ?? 0,
          nog_klaarmaken: nogKlaarmaken,
          klaar_levering: Math.max(0, klaarLevering),
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [branchFilter]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Werkplaats</h1>
          <p className="text-muted-foreground">Live overzicht van alle disciplines.</p>
        </div>
        <BranchFilter />
      </div>

      {loading || !counts ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Tile title="Inname te beoordelen" value={counts.inname} icon={<ClipboardList className="h-5 w-5" />} onClick={() => navigate("/werkplaats/inname")} />
          <Tile title="Uitdeuk open" value={counts.uitdeuk} icon={<Wrench className="h-5 w-5" />} onClick={() => navigate("/werkplaats/uitdeuken")} />
          <Tile title="Spuiterij open" value={counts.spuit_open} hint={`${counts.spuit_bezig} bezig`} icon={<PaintBucket className="h-5 w-5" />} onClick={() => navigate("/werkplaats/planning?tab=spuit")} />
          <Tile title="Werkplaats open" value={counts.werkplaats_open} hint={`${counts.werkplaats_bezig} bezig (incl. garantie)`} icon={<Wrench className="h-5 w-5" />} onClick={() => navigate("/werkplaats/planning?tab=werkplaats")} />
          <Tile title="Wacht op goedkeuring" value={counts.wacht_goedkeuring} icon={<CheckCheck className="h-5 w-5" />} onClick={() => navigate("/werkplaats/goedkeuren")} className={counts.wacht_goedkeuring > 0 ? "ring-1 ring-orange-300" : ""} />
          <Tile title="Nog klaar te maken" value={counts.nog_klaarmaken} hint="B2C met open werkorders" icon={<Sparkles className="h-5 w-5" />} onClick={() => navigate("/werkplaats/autos?tab=verkocht_b2c")} />
          <Tile title="Klaar voor levering" value={counts.klaar_levering} hint="B2C zonder open werkorders" icon={<PackageCheck className="h-5 w-5" />} onClick={() => navigate("/werkplaats/autos?tab=verkocht_b2c")} />
          <Tile title="Auto's overzicht" value={0} hint="Voorraad / B2C / Afgeleverd" icon={<Truck className="h-5 w-5" />} onClick={() => navigate("/werkplaats/autos")} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default WerkplaatsDashboard;