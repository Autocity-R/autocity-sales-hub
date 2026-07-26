import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AsPill } from "@/components/aftersales/ui";
import { Copy, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  WERKPLAATS_SERVICE_ACCOUNT_EMAIL,
  fetchWerkplaatsCalendarSettings,
  saveWerkplaatsCalendarSettings,
  testWerkplaatsCalendar,
  type WerkplaatsCalendarSettings,
} from "@/services/werkplaatsCalendarService";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branch?: string;
}

export const WerkplaatsAgendaSettingsDialog: React.FC<Props> = ({ open, onOpenChange, branch = "rotterdam" }) => {
  const [settings, setSettings] = useState<WerkplaatsCalendarSettings | null>(null);
  const [calendarId, setCalendarId] = useState("werkplaats@auto-city.nl");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchWerkplaatsCalendarSettings(branch);
      setSettings(s);
      if (s?.calendar_id) setCalendarId(s.calendar_id);
      if (s?.last_error) setResult({ ok: false, message: s.last_error });
      else if (s?.calendar_name) setResult({ ok: true, message: s.calendar_name });
    } catch (e: any) {
      toast({ title: "Kon instellingen niet laden", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, branch]);

  const handleTest = async () => {
    setTesting(true); setResult(null);
    try {
      await saveWerkplaatsCalendarSettings(branch, { calendar_id: calendarId.trim() });
      const res = await testWerkplaatsCalendar(branch, calendarId.trim());
      setResult({ ok: true, message: res.calendar_name || calendarId });
      toast({ title: "Verbinding gelukt", description: res.calendar_name });
      await load();
    } catch (e: any) {
      setResult({ ok: false, message: e.message || "Verbinding mislukt" });
    } finally { setTesting(false); }
  };

  const toggleSync = async (v: boolean) => {
    try {
      await saveWerkplaatsCalendarSettings(branch, { sync_enabled: v, calendar_id: calendarId.trim() });
      setSettings((s) => (s ? { ...s, sync_enabled: v } : s));
      toast({ title: v ? "Synchronisatie aan" : "Synchronisatie uit" });
    } catch (e: any) {
      toast({ title: "Opslaan mislukt", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Google Agenda — Werkplaats</DialogTitle>
          <DialogDescription>Synchronisatie-instellingen voor de werkplaatsagenda</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-[13px] text-slate-700">
            Er hoeft niets gedeeld te worden — de koppeling werkt via de domeinkoppeling van Auto-City.
            Vul het agenda-adres in (<b>werkplaats@auto-city.nl</b>) en klik op <b>Verbinding testen</b>.
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Service-account (technisch detail)</label>
            <div className="mt-1 flex gap-2">
              <Input readOnly value={WERKPLAATS_SERVICE_ACCOUNT_EMAIL} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(WERKPLAATS_SERVICE_ACCOUNT_EMAIL); toast({ title: "Gekopieerd" }); }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Agenda-adres</label>
            <Input className="mt-1" value={calendarId} onChange={(e) => setCalendarId(e.target.value)} placeholder="werkplaats@auto-city.nl" />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleTest} disabled={testing || loading || !calendarId.trim()}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Verbinding testen
            </Button>
            {result && (result.ok ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Verbonden met "{result.message}"
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" /> {result.message}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div className="pr-3">
              <p className="text-sm font-semibold text-slate-800">Synchronisatie aan</p>
              <p className="text-xs text-slate-500">Werkplaatsopdrachten met een geplande datum komen automatisch in deze agenda.</p>
            </div>
            <Switch checked={!!settings?.sync_enabled} onCheckedChange={toggleSync} disabled={loading} />
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            {settings?.connected_at && <AsPill tone="slate">Verbonden: {new Date(settings.connected_at).toLocaleString("nl-NL")}</AsPill>}
            {settings?.last_sync_at && <AsPill tone="green">Laatste sync: {new Date(settings.last_sync_at).toLocaleString("nl-NL")}</AsPill>}
            {settings?.last_error && <AsPill tone="red">Laatste fout: {settings.last_error}</AsPill>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WerkplaatsAgendaSettingsDialog;
