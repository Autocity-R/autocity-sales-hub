import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Send, Eye, CheckCircle2, Ban, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  cancelContractV2,
  fetchVehicleContractsV2,
  VehicleContractV2,
} from "@/services/contractV2Service";

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("nl-NL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

const StatusChip: React.FC<{
  label: string;
  at?: string | null;
  icon: React.ReactNode;
  done: boolean;
}> = ({ label, at, icon, done }) => (
  <Badge
    variant={done ? "default" : "outline"}
    className="text-xs gap-1"
    title={at ? `${label} ${fmt(at)}` : `Nog niet ${label.toLowerCase()}`}
  >
    {icon}
    {label}
    {at && <span className="opacity-80">· {fmt(at)}</span>}
  </Badge>
);

interface Props {
  vehicleId: string;
  readOnly?: boolean;
}

export const VehicleContractStatusList: React.FC<Props> = ({
  vehicleId,
  readOnly = false,
}) => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [toCancel, setToCancel] = useState<VehicleContractV2 | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: contracts = [] } = useQuery({
    queryKey: ["contractsV2", vehicleId],
    queryFn: () => fetchVehicleContractsV2(vehicleId),
    enabled: !!vehicleId,
  });

  const handleCancel = async () => {
    if (!toCancel) return;
    setBusy(true);
    const res = await cancelContractV2(toCancel.id);
    setBusy(false);
    setToCancel(null);
    if (res.error) {
      toast({
        title: "Intrekken mislukt",
        description:
          res.error === "signed_admin_only"
            ? "Een getekend contract kan alleen door een admin/eigenaar worden ingetrokken."
            : res.error === "forbidden"
              ? "Je hebt geen rechten om contracten in te trekken."
              : res.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Contract ingetrokken",
      description: "De tekenlink is direct ongeldig gemaakt.",
    });
    queryClient.invalidateQueries({ queryKey: ["contractsV2", vehicleId] });
    queryClient.invalidateQueries({ queryKey: ["vehicleFiles", vehicleId] });
  };

  if (contracts.length === 0) return null;

  return (
    <>
      <ul className="space-y-2">
        {contracts.map((c) => {
          const signed = !!c.signed_at;
          return (
            <li
              key={c.id}
              className="flex flex-col gap-2 text-sm p-3 bg-background rounded border"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium truncate">
                    {c.contract_number}
                  </span>
                  <Badge variant="outline" className="text-xs uppercase">
                    {c.contract_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.pdf_url && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3 mr-1" />
                        Getekende PDF
                      </a>
                    </Button>
                  )}
                  {!readOnly && (!signed || isAdmin) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setToCancel(c)}
                    >
                      <Ban className="h-3 w-3 mr-1" />
                      Intrekken
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <StatusChip
                  label="Verstuurd"
                  at={c.sent_at}
                  done={!!c.sent_at}
                  icon={<Send className="h-3 w-3" />}
                />
                <StatusChip
                  label="Geopend"
                  at={c.opened_at}
                  done={!!c.opened_at}
                  icon={<Eye className="h-3 w-3" />}
                />
                <StatusChip
                  label="Getekend"
                  at={c.signed_at}
                  done={signed}
                  icon={<CheckCircle2 className="h-3 w-3" />}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={!!toCancel}
        onOpenChange={(open) => !open && setToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toCancel?.signed_at
                ? "Getekend contract intrekken"
                : "Intrekken & verwijderen"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toCancel?.signed_at
                ? "Dit is een juridisch document dat al is ondertekend — weet je het zeker?"
                : "De tekenlink wordt direct ongeldig en het contract verdwijnt uit de documentenlijst. Weet je het zeker?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
            >
              {busy ? "Bezig…" : "Ja, intrekken"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
