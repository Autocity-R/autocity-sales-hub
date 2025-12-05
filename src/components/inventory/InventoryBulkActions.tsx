import React, { useState } from "react";
import { ArrowRight, Trash2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkActionDialog } from "./BulkActionDialog";
import { Vehicle } from "@/types/inventory";
import { exportVehiclesToExcel } from "@/utils/vehicleExport";
import { useToast } from "@/hooks/use-toast";

interface InventoryBulkActionsProps {
  selectedVehicles: string[];
  vehicles: Vehicle[];
  onBulkAction: (action: string, value?: string) => void;
}

export const InventoryBulkActions = ({ selectedVehicles, vehicles, onBulkAction }: InventoryBulkActionsProps) => {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleExportToExcel = () => {
    // Filter vehicles to only include selected ones
    const vehiclesToExport = vehicles.filter(v => selectedVehicles.includes(v.id));
    
    if (vehiclesToExport.length === 0) {
      toast({
        title: "Geen voertuigen geselecteerd",
        description: "Selecteer eerst voertuigen om te exporteren",
        variant: "destructive"
      });
      return;
    }

    const result = exportVehiclesToExcel(vehiclesToExport);
    
    if (result.success) {
      toast({
        title: "Export succesvol",
        description: `${result.count} voertuig(en) geëxporteerd naar ${result.filename}`,
      });
    }
  };

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
          variant="outline" 
          size="sm" 
          disabled={selectedVehicles.length === 0}
          onClick={handleExportToExcel}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exporteer naar Excel
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
