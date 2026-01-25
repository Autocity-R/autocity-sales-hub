import React, { useState } from "react";
import { FileSpreadsheet, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BulkActionDialog } from "./BulkActionDialog";
import { Vehicle } from "@/types/inventory";
import { exportB2BPaymentOverview } from "@/utils/b2bPaymentExport";
import { useToast } from "@/hooks/use-toast";

interface B2BInventoryHeaderProps {
  selectedVehicles: string[];
  vehicles: Vehicle[];
  onBulkAction: (action: string, value?: string) => void;
}

export const B2BInventoryHeader = ({ selectedVehicles, vehicles, onBulkAction }: B2BInventoryHeaderProps) => {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportPaymentOverview = async () => {
    // Als er voertuigen geselecteerd zijn, exporteer alleen die
    // Anders exporteer alle voertuigen
    const vehiclesToExport = selectedVehicles.length > 0
      ? vehicles.filter(v => selectedVehicles.includes(v.id))
      : vehicles;

    if (vehiclesToExport.length === 0) {
      toast({
        variant: "destructive",
        title: "Geen voertuigen",
        description: "Er zijn geen voertuigen om te exporteren"
      });
      return;
    }

    setIsExporting(true);
    try {
      const fileName = await exportB2BPaymentOverview(vehiclesToExport);
      toast({
        title: "Export succesvol",
        description: `${vehiclesToExport.length} voertuig(en) geëxporteerd naar ${fileName}`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export mislukt",
        description: "Er ging iets mis bij het exporteren"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <PageHeader 
        title="Verkocht B2B" 
        description="Beheer uw verkochte voertuigen aan zakelijke klanten"
      >
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPaymentOverview}
            disabled={isExporting}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporteren...' : `Betalingsoverzicht${selectedVehicles.length > 0 ? ` (${selectedVehicles.length})` : ''}`}
          </Button>
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
      </PageHeader>

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
