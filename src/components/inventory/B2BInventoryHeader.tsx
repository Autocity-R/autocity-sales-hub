
import React, { useState } from "react";
import { FileText, Mail, Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BulkActionDialog } from "./BulkActionDialog";

interface B2BInventoryHeaderProps {
  selectedVehicles: string[];
  onBulkAction: (action: string, value?: string) => void;
}

export const B2BInventoryHeader = ({ selectedVehicles, onBulkAction }: B2BInventoryHeaderProps) => {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

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
