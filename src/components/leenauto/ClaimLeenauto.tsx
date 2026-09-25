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
  Uitlening, fetchOpenUitleningVoorClaim, formatNL, fromLocalInput, isTeLaat, leenautoInnemen, toLocalInput,
} from "@/services/leenautoService";
import { LeenautoInleverDialog, LeenautoUitleenDialog } from "./LeenautoDialogs";
import { useToast } from "@/hooks/use-toast";

export const useOpenClaimUitlening = (claim: Pick<WarrantyClaim, "id" | "loanCarId">) =>
  useQuery({
    queryKey: ["claimUitlening", claim.id],
    queryFn: () => fetchOpenUitleningVoorClaim(claim.id, claim.loanCarId),
  });

/** Leenauto-blok in de claimdetail: uitlenen via de registratie, of de open uitlening tonen. */
export const ClaimLeenautoSection: React.FC<{ claim: WarrantyClaim; canManage: boolean }> = ({ claim, canManage }) => {
  const qc = useQueryClient();
  const { data: open } = useOpenClaimUitlening(claim);
  const { data: cars = [] } = useQuery({ queryKey: ["loanCars"], queryFn: fetchLoanCars });
  const available = cars.filter((c: LoanCar) => c.available);
  const [carId, setCarId] = useState("");
  const [uitleenOpen, setUitleenOpen] = useState(false);
  const [inleverOpen, setInleverOpen] = useState(false);
  const car = cars.find((c) => c.id === (open?.loan_car_id || carId));
  const label = car ? `${car.brand} ${car.model} — ${car.licenseNumber}` : open?.kenteken || "";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["claimUitlening", claim.id] });
    qc.invalidateQueries({ queryKey: ["loanCars"] });
    qc.invalidateQueries({ queryKey: ["leenautoUitleningen"] });
    qc.invalidateQueries({ queryKey: ["warrantyClaims"] });
    setCarId("");
  };

  if (open) {
    return (
      <div className="p-3 rounded-md border bg-muted/40 space-y-2" data-testid="claim-open-uitlening">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{label}</span>
          <Badge variant="secondary">Uitgeleend</Badge>
          {isTeLaat(open) && <Badge variant="destructive">TE LAAT</Badge>}
        </div>
        <div className="text-sm">
          Aan <strong>{open.klant_naam}</strong> sinds {formatNL(open.uitgeleend_op)} · verwacht terug {formatNL(open.verwacht_terug_op)}
        </div>
        {canManage && <Button size="sm" variant="outline" onClick={() => setInleverOpen(true)}>Inleveren</Button>}
        <LeenautoInleverDialog open={inleverOpen} onOpenChange={setInleverOpen} uitlening={open} loanCarLabel={label} onDone={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {claim.loanCarAssigned && !claim.loanCarId && (
        <p className="text-sm text-amber-700 dark:text-amber-400">Klant heeft een leenauto nodig — nog niet uitgegeven.</p>
      )}
      {canManage ? (
        <div className="flex gap-2">
          <Select value={carId || "none"} onValueChange={(v) => setCarId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Kies beschikbare leenauto…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kies beschikbare leenauto…</SelectItem>
              {available.map((c) => <SelectItem key={c.id} value={c.id}>{c.brand} {c.model} - {c.licenseNumber}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button disabled={!carId} onClick={() => setUitleenOpen(true)}>Uitlenen</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Geen open uitlening.</p>
      )}
      {carId && (
        <LeenautoUitleenDialog
          open={uitleenOpen}
          onOpenChange={setUitleenOpen}
          loanCarId={carId}
          loanCarLabel={label}
          lockClaim
          defaults={{
            contactId: claim.customerId || null,
            klantNaam: claim.customerName && claim.customerName !== "Onbekend" ? claim.customerName : "",
            klantTelefoon: claim.customerPhone || "",
            klantEmail: claim.customerEmail || "",
            warrantyClaimId: claim.id,
            reden: "garantie",
          }}
          onDone={refresh}
        />
      )}
    </div>
  );
};

/**
 * Verplichte vraag bij afwikkelen van een claim met een open uitlening.
 * Er is geen "annuleren zonder keuze" dat alsnog afwikkelt: óf ingeleverd, óf klant heeft hem nog, óf terug.
 */
export const ResolveLeenautoGuard: React.FC<{
  open: boolean;
  uitlening: Uitlening | null;
  onCancel: () => void;
  onProceed: () => void;
}> = ({ open, uitlening, onCancel, onProceed }) => {
  const { toast } = useToast();
  const [moment, setMoment] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setMoment(toLocalInput(new Date())); }, [open]);
  if (!uitlening) return null;

  const ingeleverd = async () => {
    const d = fromLocalInput(moment);
    if (!d) return;
    setBusy(true);
    try {
      await leenautoInnemen(uitlening.id, d, "Ingeleverd bij afwikkelen garantieclaim");
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
