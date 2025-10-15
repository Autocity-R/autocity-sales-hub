import React, { useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkActionDialog } from "./BulkActionDialog";

interface InventoryBulkActionsProps {
  selectedVehicles: string[];
  onBulkAction: (action: string, value?: string) => void;
}

export const InventoryBulkActions = ({ selectedVehicles, onBulkAction }: InventoryBulkActionsProps) => {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  return (
    <>
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={selectedVehicles.length === 0}
          onClick={() => setBulkDialogOpen(true)}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Bulk acties ({selectedVehicles.length})
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          disabled={selectedVehicles.length === 0}
          onClick={() => {
            if (confirm(`Weet u zeker dat u ${selectedVehicles.length} voertuig(en) wilt verwijderen?`)) {
              onBulkAction('delete');
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Verwijderen
        </Button>
      </div>

      <BulkActionDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onApply={(action, value) => {
          onBulkAction(action, value);
          setBulkDialogOpen(false);
        }}
        count={selectedVehicles.length}
      />
    </>
  );
};
