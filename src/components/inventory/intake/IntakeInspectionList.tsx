import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, FileText, Loader2, AlertCircle, ShieldAlert, Plus } from "lucide-react";
import { useIntakeInspections, IntakeInspectionRow } from "@/hooks/useIntakeInspections";
import { IntakeInspectionDialog } from "./IntakeInspectionDialog";

interface Props {
  vehicleId: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleLicense?: string;
  vehicleYear?: number;
  vehicleMileage?: number;
  readOnly?: boolean;
}

const statusLabel = (s: string) => {
  switch (s) {
    case "pending": return "Wachten";
    case "extracting": return "Frames uitlezen";
    case "analyzing": return "Robin analyseert";
    case "generating_pdf": return "PDF maken";
    case "completed": return "Klaar";
    case "reviewed": return "Beoordeeld";
    case "failed": return "Mislukt";
    default: return s;
  }
};

const formatEuro = (n: number | null | undefined) =>
  typeof n === "number" ? `€ ${n.toLocaleString("nl-NL")}` : "—";

const formatDate = (s: string) =>
  new Date(s).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const IntakeInspectionList: React.FC<Props> = ({
  vehicleId, vehicleBrand, vehicleModel, vehicleLicense, vehicleYear, vehicleMileage, readOnly,
}) => {
  const { inspections, loading } = useIntakeInspections(vehicleId);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="border rounded-md p-4 space-y-4 bg-[hsl(220_60%_15%/0.05)] border-[hsl(220_60%_25%/0.2)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[hsl(220_60%_25%)]" />
            <h4 className="font-medium">Robin — Inname Inspectie</h4>
            <Badge variant="default">{inspections.length}</Badge>
          </div>
          {!readOnly && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nieuwe inspectie
            </Button>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Laden...</p>}

        {!loading && inspections.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nog geen inspecties. Start een video-inname om Robin een schaderapport te laten maken.
          </p>
        )}

        {inspections.length > 0 && (
          <ul className="space-y-2">
            {inspections.map((i) => <InspectionRow key={i.id} inspection={i} />)}
          </ul>
        )}
      </div>

      <IntakeInspectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicleId={vehicleId}
        vehicleBrand={vehicleBrand}
        vehicleModel={vehicleModel}
        vehicleLicense={vehicleLicense}
        defaultYear={vehicleYear}
        defaultMileage={vehicleMileage}
      />
    </>
  );
};

const InspectionRow: React.FC<{ inspection: IntakeInspectionRow }> = ({ inspection }) => {
  const inProgress = ["pending", "extracting", "analyzing", "generating_pdf"].includes(inspection.status);
  const failed = inspection.status === "failed";
  const done = inspection.status === "completed" || inspection.status === "reviewed";

  return (
    <li className="flex items-center justify-between gap-3 p-3 bg-background rounded border flex-wrap">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {inProgress && <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />}
        {failed && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
        {done && <FileText className="h-4 w-4 text-primary shrink-0" />}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{formatDate(inspection.created_at)}</span>
            {inspection.categorie && (
              <Badge variant="secondary" className="text-xs">Cat. {inspection.categorie}</Badge>
            )}
            <Badge variant={failed ? "destructive" : inProgress ? "outline" : "default"} className="text-xs">
              {statusLabel(inspection.status)}
            </Badge>
            {inspection.claim_aanbevolen && (
              <Badge className="text-xs bg-amber-500 text-white flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Claim {formatEuro(inspection.claim_waarde)}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {inspection.created_by_name ?? "Onbekend"}
            {done && (
              <> · {inspection.schade_count ?? 0} schades · {formatEuro(inspection.totale_kosten_min)} – {formatEuro(inspection.totale_kosten_max)}</>
            )}
            {inspection.frames_extracted ? <> · {inspection.frames_extracted} frames</> : null}
          </span>
          {failed && inspection.error_message && (
            <span className="text-xs text-destructive mt-1">{inspection.error_message}</span>
          )}
        </div>
      </div>
      {inspection.pdf_url && (
        <Button size="sm" variant="outline" asChild>
          <a href={inspection.pdf_url} target="_blank" rel="noopener noreferrer">PDF openen</a>
        </Button>
      )}
    </li>
  );
};