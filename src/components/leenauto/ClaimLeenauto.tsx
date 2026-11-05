import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WarrantyClaim, LoanCar } from "@/types/warranty";
import { fetchLoanCars } from "@/services/loanCarService";
import {
  Uitlening, fetchUitleningenVoorClaim, formatNL, fromLocalInput, isTeLaat, leenautoInnemen, toLocalInput,
} from "@/services/leenautoService";
import { mapClaimUitleningen, magInnemenVanuitClaim } from "@/lib/claimLeenauto";
import { LeenautoInleverDialog, LeenautoUitleenDialog } from "./LeenautoDialogs";
import { useToast } from "@/hooks/use-toast";

/** dd-mm-jjjj uu:mm in NL-tijd */
export const formatNLKort = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const p = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  return `${g("day")}-${g("month")}-${g("year")} ${g("hour")}:${g("minute")}`;
};

export const useClaimUitleningen = (claimId: string) =>
  useQuery({ queryKey: ["claimUitlening", claimId], queryFn: () => fetchUitleningenVoorClaim(claimId) });

/** Open uitlening van uitsluitend déze claim (warranty_claim_id). */
export const useOpenClaimUitlening = (claim: Pick<WarrantyClaim, "id">) => {
  const q = useClaimUitleningen(claim.id);
  const pick = (rows?: Uitlening[]) => rows?.find((r) => r.warranty_claim_id === claim.id && !r.ingeleverd_op) ?? null;
  return {
    data: pick(q.data),
    refetch: async () => {
      const r = await q.refetch();
      return { data: pick(r.data) };
    },
  };
};

const AFGESLOTEN = new Set(["opgelost", "vervallen"]);

export const ClaimLeenautoSection: React.FC<{ claim: WarrantyClaim; canManage: boolean }> = ({ claim, canManage }) => {
  const qc = useQueryClient();
  const { data: rows = [] } = useClaimUitleningen(claim.id);
  const { data: cars = [] } = useQuery({ queryKey: ["loanCars"], queryFn: () => fetchLoanCars() });
  const afgesloten = AFGESLOTEN.has(claim.status);
  const [carId, setCarId] = useState("");
  const [uitleenOpen, setUitleenOpen] = useState(false);
  const [inleverOpen, setInleverOpen] = useState(false);
  const [achterafOpen, setAchterafOpen] = useState(false);

  const s = mapClaimUitleningen(claim.id, rows, {
    loanCarId: claim.loanCarId, loanCarAssigned: claim.loanCarAssigned, kenteken: claim.loanCarDetails?.licenseNumber,
  });
  const open = s.soort === "open" ? s.open : null;
  const gesloten = s.soort === "open" || s.soort === "gehad" ? s.gesloten : [];
  // Uitlenen: alleen beschikbare auto's; achteraf registreren: elke auto (DB weigert overlap).
  const keuze = afgesloten ? cars : cars.filter((c: LoanCar) => c.available);
  const car = cars.find((c) => c.id === carId);
  const label = car ? `${car.brand} ${car.model} — ${car.licenseNumber}` : "";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["claimUitlening", claim.id] });
    qc.invalidateQueries({ queryKey: ["claimUitleningen"] });
    qc.invalidateQueries({ queryKey: ["loanCars"] });
    qc.invalidateQueries({ queryKey: ["leenautoUitleningen"] });
    qc.invalidateQueries({ queryKey: ["warrantyClaims"] });
    setCarId("");
  };

  return (
    <div className="space-y-2">
      {open && (
        <div className="p-3 rounded-md border bg-muted/40 space-y-2" data-testid="claim-open-uitlening">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Uitgeleend</Badge>
            {isTeLaat(open) && <Badge variant="destructive">TE LAAT</Badge>}
          </div>
          <div className="text-sm">
            Uitgeleend: <strong>{open.kenteken}</strong> aan <strong>{open.klant_naam}</strong> sinds {formatNLKort(open.uitgeleend_op)}, verwacht terug {formatNLKort(open.verwacht_terug_op)}
          </div>
          {canManage && magInnemenVanuitClaim(open, claim.id) && (
            <Button size="sm" variant="outline" onClick={() => setInleverOpen(true)}>Inleveren</Button>
          )}
          <LeenautoInleverDialog open={inleverOpen} onOpenChange={setInleverOpen} uitlening={open} loanCarLabel={open.kenteken || ""} claimId={claim.id} onDone={refresh} />
        </div>
      )}

      {gesloten.map((u) => (
        <div key={u.id} className="text-sm text-muted-foreground" data-testid="claim-gesloten-uitlening">
          Gehad: <strong className="text-foreground">{u.kenteken}</strong> — {u.klant_naam}, {formatNLKort(u.uitgeleend_op)} t/m {formatNLKort(u.ingeleverd_op)}
        </div>
      ))}

      {s.soort === "oud" && (
        <p className="text-sm text-muted-foreground" data-testid="claim-oude-leenauto">
          Leenauto (oude registratie, niet gekoppeld aan een uitlening){s.kenteken ? `: ${s.kenteken}` : ""}
        </p>
      )}

      {s.soort === "geen" && !canManage && <p className="text-sm text-muted-foreground">Geen uitlening.</p>}

      {canManage && !open && !afgesloten && (
        <div className="flex gap-2">
          <Select value={carId || "none"} onValueChange={(v) => setCarId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Kies beschikbare leenauto…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kies beschikbare leenauto…</SelectItem>
              {keuze.map((c) => <SelectItem key={c.id} value={c.id}>{c.brand} {c.model} - {c.licenseNumber}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button disabled={!carId} onClick={() => setUitleenOpen(true)}>Uitlenen</Button>
        </div>
      )}

      {canManage && afgesloten && (
        achterafOpen ? (
          <div className="flex gap-2">
            <Select value={carId || "none"} onValueChange={(v) => setCarId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Kies leenauto…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kies leenauto…</SelectItem>
                {keuze.map((c) => <SelectItem key={c.id} value={c.id}>{c.brand} {c.model} - {c.licenseNumber}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button disabled={!carId} onClick={() => setUitleenOpen(true)}>Registreren</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAchterafOpen(true)}>Leenauto achteraf registreren</Button>
        )
      )}

      {carId && (
        <LeenautoUitleenDialog
          open={uitleenOpen}
          onOpenChange={setUitleenOpen}
          loanCarId={carId}
          loanCarLabel={label}
          lockClaim
          achteraf={afgesloten}
          defaults={{
            contactId: claim.customerId || null,
            klantNaam: claim.customerName && claim.customerName !== "Onbekend" ? claim.customerName : "",
            klantTelefoon: claim.customerPhone || "",
            klantEmail: claim.customerEmail || "",
            warrantyClaimId: claim.id,
            reden: "garantie",
          }}
          onDone={() => { setAchterafOpen(false); refresh(); }}
        />
      )}
    </div>
  );
};

/**
 * Verplichte vraag bij afwikkelen van een claim met een open uitlening.
 * Weigert uitleningen die niet bij déze claim horen.
 */
export const ResolveLeenautoGuard: React.FC<{
  open: boolean;
  uitlening: Uitlening | null;
  claimId: string;
  onCancel: () => void;
  onProceed: () => void;
}> = ({ open, uitlening, claimId, onCancel, onProceed }) => {
  const { toast } = useToast();
  const [moment, setMoment] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setMoment(toLocalInput(new Date())); }, [open]);
  if (!uitlening || !magInnemenVanuitClaim(uitlening, claimId)) return null;

  const ingeleverd = async () => {
    const d = fromLocalInput(moment);
    if (!d) return;
    if (!magInnemenVanuitClaim(uitlening, claimId)) {
      toast({ title: "Inleveren geweigerd", description: "Deze uitlening hoort bij een andere claim", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await leenautoInnemen(uitlening.id, d, "Ingeleverd bij afwikkelen garantieclaim", claimId);
      onProceed();
    } catch (e: any) {
      toast({ title: "Inleveren mislukt", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v && !busy) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leenauto nog uitgeleend</AlertDialogTitle>
          <AlertDialogDescription>
            Leenauto <strong>{uitlening.kenteken}</strong> is nog uitgeleend aan <strong>{uitlening.klant_naam}</strong> sinds {formatNL(uitlening.uitgeleend_op)}. Is de auto ingeleverd?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1">
          <Label htmlFor="guard-moment">Ingeleverd op</Label>
          <Input id="guard-moment" type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} />
        </div>
        <AlertDialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Terug</Button>
          <Button variant="outline" onClick={onProceed} disabled={busy}>Nee, klant heeft hem nog</Button>
          <Button onClick={ingeleverd} disabled={busy}>{busy ? "Bezig…" : "Ja, ingeleverd"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
