import React, { useEffect, useState } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserX, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { setUserActive, UserProfile, OpenWerkKeuze } from "@/services/userService";
import { ROLE_OPTIONS } from "@/lib/roles";

interface OpenItem { id: string; label: string; soort: "Taak" | "Werkorder" }

const name = (u: UserProfile) => `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;

/** Uit dienst zetten: blokkeert inloggen, haalt rollen weg, naam blijft bij historie. */
export const UitDienstDialog: React.FC<{
  user: UserProfile | null;
  colleagues: UserProfile[];
  onClose: () => void;
}> = ({ user, colleagues, onClose }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState<OpenItem[] | null>(null);
  const [keuze, setKeuze] = useState<OpenWerkKeuze>("laten");
  const [naar, setNaar] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setOpen(null); setKeuze("laten"); setNaar("");
    (async () => {
      const [{ data: t }, { data: w }] = await Promise.all([
        supabase.from("tasks").select("id, title, category").eq("assigned_to", user.id)
          .in("status", ["toegewezen", "in_uitvoering", "uitgesteld"]),
        supabase.from("work_orders").select("id, discipline, description").eq("assigned_to", user.id)
          .in("status", ["aangevraagd", "ingepland", "bezig", "gepauzeerd"]),
      ]);
      setOpen([
        ...((t as any[]) || []).map((x) => ({ id: x.id, soort: "Taak" as const, label: `${x.title}${x.category ? ` (${x.category})` : ""}` })),
        ...((w as any[]) || []).map((x) => ({ id: x.id, soort: "Werkorder" as const, label: `${x.discipline}: ${x.description || ""}` })),
      ]);
    })();
  }, [user]);

  if (!user) return null;
  const heeftOpen = (open?.length || 0) > 0;

  const go = async () => {
    if (heeftOpen && keuze === "overdragen" && !naar) {
      toast({ title: "Kies een collega", variant: "destructive" }); return;
    }
    setBusy(true);
    const r = await setUserActive({
      userId: user.id, actie: "deactiveren",
      openWerk: heeftOpen ? keuze : "laten", overdragenAan: keuze === "overdragen" ? naar : undefined,
    });
    setBusy(false);
    if (!r.success) { toast({ title: "Uit dienst zetten mislukt", description: r.error, variant: "destructive" }); return; }
    toast({ title: "Uit dienst", description: r.message });
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    onClose();
  };

  return (
    <AlertDialog open={!!user} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><UserX className="h-5 w-5" />{name(user)} uit dienst zetten?</AlertDialogTitle>
          <AlertDialogDescription>
            Inloggen wordt direct geblokkeerd en de rol vervalt. De naam blijft staan bij oude taken, orders en historie.
            Heractiveren kan later via het tabblad "Uit dienst".
          </AlertDialogDescription>
        </AlertDialogHeader>

        {open === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Open werk ophalen…</div>
        ) : heeftOpen ? (
          <div className="space-y-3">
            <div className="text-sm font-medium">{open.length} open taak/werkorder(s):</div>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5 max-h-40 overflow-auto">
              {open.map((o) => <li key={o.id}>{o.soort} — {o.label}</li>)}
            </ul>
            <div className="space-y-1.5">
              <Label>Wat moet er met dit open werk gebeuren?</Label>
              <Select value={keuze} onValueChange={(v) => setKeuze(v as OpenWerkKeuze)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="laten">Laten staan (niet wijzigen)</SelectItem>
                  <SelectItem value="overdragen">Overdragen aan …</SelectItem>
                  <SelectItem value="afsluiten">Afsluiten (annuleren)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {keuze === "overdragen" && (
              <Select value={naar} onValueChange={setNaar}>
                <SelectTrigger aria-label="Overdragen aan"><SelectValue placeholder="Kies collega" /></SelectTrigger>
                <SelectContent>
                  {colleagues.filter((c) => c.id !== user.id && c.actief !== false).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{name(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Geen open taken of werkorders.</div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annuleren</AlertDialogCancel>
          <Button variant="destructive" onClick={go} disabled={busy || open === null}>
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Uit dienst zetten
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const HeractiverenDialog: React.FC<{ user: UserProfile | null; onClose: () => void }> = ({ user, onClose }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rol, setRol] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setRol(""); }, [user]);
  if (!user) return null;

  const go = async () => {
    if (!rol) { toast({ title: "Kies een rol", variant: "destructive" }); return; }
    setBusy(true);
    const r = await setUserActive({ userId: user.id, actie: "heractiveren", rol });
    setBusy(false);
    if (!r.success) { toast({ title: "Heractiveren mislukt", description: r.error, variant: "destructive" }); return; }
    toast({ title: "Weer actief", description: r.message });
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    onClose();
  };

  return (
    <AlertDialog open={!!user} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />{name(user)} heractiveren</AlertDialogTitle>
          <AlertDialogDescription>Inloggen wordt weer toegestaan met de gekozen rol.</AlertDialogDescription>
        </AlertDialogHeader>
        <Select value={rol} onValueChange={setRol}>
          <SelectTrigger aria-label="Rol"><SelectValue placeholder="Kies rol" /></SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annuleren</AlertDialogCancel>
          <Button onClick={go} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Heractiveren</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
