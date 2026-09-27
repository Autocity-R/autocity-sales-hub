import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWorkSchedule, setWorkSchedule, WEEKDAY_LABELS, type WorkSchedule } from "@/lib/workHours";

const EDIT_ROLES = ["owner", "admin", "aftersales_manager", "operationeel_directeur"];

/** Werktijden werkplaats: per weekdag aan/uit + begin/eindtijd. Timers pauzeren automatisch na de eindtijd. */
export const WerktijdenSettings: React.FC = () => {
  const { userRole, isAdmin } = useAuth();
  const canEdit = isAdmin || EDIT_ROLES.includes(userRole || "");
  const [s, setS] = useState<WorkSchedule | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchWorkSchedule().then(setS); }, []);

  const upd = (d: number, patch: Partial<WorkSchedule[number]>) => setS(prev => prev ? { ...prev, [d]: { ...prev[d], ...patch } } : prev);

  const save = async () => {
    if (!s) return;
    const bad = Object.entries(s).find(([, v]) => v.enabled && v.end <= v.start);
    if (bad) { toast({ title: "Eindtijd moet na begintijd liggen", description: WEEKDAY_LABELS[Number(bad[0])], variant: "destructive" }); return; }
    setSaving(true);
    const rows = Object.entries(s).map(([d, v]) => ({ weekday: Number(d), enabled: v.enabled, start_time: v.start, end_time: v.end }));
    const { error } = await (supabase as any).from("werkplaats_werktijden").upsert(rows, { onConflict: "weekday" });
    setSaving(false);
    if (error) { toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" }); return; }
    setWorkSchedule(s);
    toast({ title: "Werktijden opgeslagen" });
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><Clock className="h-4 w-4" /> Werktijden werkplaats</div>
      <p className="text-[12px] text-slate-500">
        Lopende timers worden na de eindtijd automatisch gepauzeerd. Alleen tijd binnen deze uren telt als gewerkt in de rapportages.
      </p>
      {!s ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7].map(d => (
            <div key={d} className="flex flex-wrap items-center gap-2">
              <Switch checked={s[d].enabled} disabled={!canEdit} onCheckedChange={(v) => upd(d, { enabled: v })} aria-label={`${WEEKDAY_LABELS[d]} aan/uit`} />
              <span className="w-24 text-[13px] text-slate-800">{WEEKDAY_LABELS[d]}</span>
              <Input type="time" className="h-10 w-28" value={s[d].start} disabled={!canEdit || !s[d].enabled} onChange={(e) => upd(d, { start: e.target.value })} aria-label={`${WEEKDAY_LABELS[d]} begintijd`} />
              <span className="text-slate-400">–</span>
              <Input type="time" className="h-10 w-28" value={s[d].end} disabled={!canEdit || !s[d].enabled} onChange={(e) => upd(d, { end: e.target.value })} aria-label={`${WEEKDAY_LABELS[d]} eindtijd`} />
            </div>
          ))}
          {canEdit ? (
            <Button onClick={save} disabled={saving} className="h-10">{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Werktijden opslaan</Button>
          ) : <p className="text-[12px] text-slate-500">Alleen owner, admin, aftersales en de operationeel directeur kunnen dit wijzigen.</p>}
        </div>
      )}
    </div>
  );
};

export default WerktijdenSettings;
