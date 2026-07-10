import React, { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

type Branch = "rotterdam" | "heerhugowaard";

const BRANCH_LABEL: Record<Branch, string> = {
  rotterdam: "Rotterdam",
  heerhugowaard: "Heerhugowaard",
};

interface Props {
  selectedVehicleIds: string[];
  invalidateQueryKeys?: (string | readonly unknown[])[];
  onDone?: () => void;
}

/**
 * Admin-only bulk action: move selected vehicles to a target branch.
 * Runs a normal per-vehicle UPDATE so DB triggers (audit + task/appointment
 * propagation) fire exactly like a single edit via the detail dialog.
 */
export const BulkBranchMoveButton: React.FC<Props> = ({
  selectedVehicleIds,
  invalidateQueryKeys = [],
  onDone,
}) => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [targetBranch, setTargetBranch] = useState<Branch | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isAdmin) return null;

  const disabled = selectedVehicleIds.length === 0;

  const runMove = async () => {
    if (!targetBranch) return;
    setIsRunning(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedVehicleIds) {
      const { error } = await supabase
        .from("vehicles")
        .update({ branch: targetBranch })
        .eq("id", id);
      if (error) {
        console.error("[BulkBranchMove] failed for", id, error);
        fail++;
      } else {
        ok++;
      }
    }

    // Invalidate any provided query keys + common vehicle queries
    const keys: (string | readonly unknown[])[] = [
      ...invalidateQueryKeys,
      ["vehicles"],
      ["b2cVehicles"],
      ["b2bVehicles"],
      ["deliveredVehicles"],
      ["tasks"],
      ["appointments"],
    ];
    await Promise.all(
      keys.map((k) =>
        queryClient.invalidateQueries({
          queryKey: Array.isArray(k) ? (k as unknown[]) : [k as string],
        }),
      ),
    );

    setIsRunning(false);
    setTargetBranch(null);

    if (ok > 0 && fail === 0) {
      toast.success(
        `${ok} voertuig(en) verplaatst naar ${BRANCH_LABEL[targetBranch]}`,
      );
    } else if (ok > 0 && fail > 0) {
      toast.warning(
        `${ok} verplaatst, ${fail} mislukt (zie console voor details)`,
      );
    } else {
      toast.error(`Verplaatsen mislukt voor ${fail} voertuig(en)`);
    }
    onDone?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            <Building2 className="h-4 w-4 mr-2" />
            Verplaats naar vestiging
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Doelvestiging</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setTargetBranch("rotterdam")}>
            Rotterdam
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTargetBranch("heerhugowaard")}>
            Heerhugowaard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={targetBranch !== null}
        onOpenChange={(open) => {
          if (!open && !isRunning) setTargetBranch(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voertuigen verplaatsen</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt om <b>{selectedVehicleIds.length}</b>{" "}
              voertuig(en) te verplaatsen naar{" "}
              <b>{targetBranch ? BRANCH_LABEL[targetBranch] : ""}</b>. Open taken
              en toekomstige afspraken van deze voertuigen worden automatisch
              meeverhuisd. Voltooide taken en historische afspraken behouden hun
              oorspronkelijke vestiging.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRunning}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runMove();
              }}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Verplaatsen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkBranchMoveButton;