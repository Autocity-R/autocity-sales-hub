import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, ChevronDown, ChevronUp, History } from "lucide-react";
import { LoanCar } from "@/types/warranty";
import { REDEN_LABELS, Uitlening, formatNL, isTeLaat, leenautoVrijgevenZonderRegistratie } from "@/services/leenautoService";
import { LeenautoInleverDialog, LeenautoUitleenDialog } from "./LeenautoDialogs";
import { useToast } from "@/hooks/use-toast";

interface Props {
  car: LoanCar;
  uitleningen: Uitlening[]; // alle uitleningen van deze auto, nieuwste eerst
  canWrite: boolean;
  onChanged: () => void;
  actions?: React.ReactNode;
}

export const LoanCarRow: React.FC<Props> = ({ car, uitleningen, canWrite, onChanged, actions }) => {
  const { toast } = useToast();
  const [showHist, setShowHist] = useState(false);
  const [uitleenOpen, setUitleenOpen] = useState(false);
  const [inleverOpen, setInleverOpen] = useState(false);
  const open = uitleningen.find((u) => !u.ingeleverd_op) || null;
  const legacy = !car.available && !open; // uitgeleend van vóór de registratie
  const teLaat = open ? isTeLaat(open) : false;
  const label = `${car.brand} ${car.model} — ${car.licenseNumber}`;

  const vrijgeven = async () => {
    try {
      await leenautoVrijgevenZonderRegistratie(car.id);
      toast({ title: "Leenauto weer beschikbaar", description: label });
      onChanged();
    } catch (e: any) {
      toast({ title: "Innemen mislukt", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="border rounded-lg" data-testid={`loan-car-${car.licenseNumber}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="font-medium">{car.brand} {car.model}</div>
            <div className="text-sm text-muted-foreground">Kenteken: {car.licenseNumber}</div>
            {open && (
              <div className="text-sm">
                <span className="font-medium">{open.klant_naam}</span>
                {open.klant_telefoon && <span className="text-muted-foreground"> · {open.klant_telefoon}</span>}
                <div className="text-xs text-muted-foreground">
                  Sinds {formatNL(open.uitgeleend_op)} · verwacht terug {formatNL(open.verwacht_terug_op)} · {REDEN_LABELS[open.reden]}
                </div>
              </div>
            )}
            {legacy && (
              <div className="text-sm text-amber-700 dark:text-amber-400">
                Uitgeleend — klant onbekend (van vóór registratie)
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {car.available ? (
            <Badge>Beschikbaar</Badge>
          ) : (
            <Badge variant="secondary">Uitgeleend</Badge>
          )}
          {teLaat && <Badge variant="destructive">TE LAAT</Badge>}
          {canWrite && car.available && (
            <Button size="sm" onClick={() => setUitleenOpen(true)}>Uitlenen</Button>
          )}
          {canWrite && open && (
            <Button size="sm" variant="outline" onClick={() => setInleverOpen(true)}>Inleveren</Button>
          )}
          {canWrite && legacy && (
            <>
              <Button size="sm" onClick={() => setUitleenOpen(true)}>Alsnog vastleggen</Button>
              <Button size="sm" variant="outline" onClick={vrijgeven}>Innemen</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowHist((v) => !v)}>
            <History className="h-4 w-4 mr-1" /> Historie ({uitleningen.length})
            {showHist ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
          {actions}
        </div>
      </div>
      {showHist && (
        <div className="border-t px-4 py-3 space-y-2 bg-muted/30">
          {uitleningen.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nog geen geregistreerde uitleningen.</div>
          ) : uitleningen.map((u) => (
            <div key={u.id} className="text-sm flex flex-wrap justify-between gap-2 border-b last:border-0 pb-2">
              <div>
                <span className="font-medium">{u.klant_naam}</span>
                <span className="text-muted-foreground"> · {[u.klant_telefoon, u.klant_email].filter(Boolean).join(" · ")}</span>
                {u.notities && <div className="text-xs text-muted-foreground whitespace-pre-line">{u.notities}</div>}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {formatNL(u.uitgeleend_op)} → {u.ingeleverd_op ? formatNL(u.ingeleverd_op) : "nog uitgeleend"}
                <div>{REDEN_LABELS[u.reden]}{isTeLaat(u) ? " · TE LAAT" : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <LeenautoUitleenDialog
        open={uitleenOpen}
        onOpenChange={setUitleenOpen}
        loanCarId={car.id}
        loanCarLabel={label}
        achteraf={legacy}
        onDone={onChanged}
      />
      <LeenautoInleverDialog
        open={inleverOpen}
        onOpenChange={setInleverOpen}
        uitlening={open}
        loanCarLabel={label}
        onDone={onChanged}
      />
    </div>
  );
};
