import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: string[];
}

export const VehicleDeleteBlockedDialog: React.FC<Props> = ({ open, onOpenChange, vehicles }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Kan niet verwijderen</AlertDialogTitle>
        <AlertDialogDescription>
          Er hangen werkplaats-afspraken of -historie aan{" "}
          {vehicles.length === 1 ? "deze auto" : "deze auto's"}. Verwijder eerst de werkorders,
          facturen of inname-historie in de werkplaats, of laat het voertuig staan om de historie te
          bewaren.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {vehicles.length > 0 && (
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 max-h-48 overflow-auto">
          {vehicles.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      )}
      <AlertDialogFooter>
        <AlertDialogAction onClick={() => onOpenChange(false)}>Begrepen</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
