
import React from "react";
import { FileText, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

interface B2BInventoryHeaderProps {
  selectedVehicles: string[];
}

export const B2BInventoryHeader = ({ selectedVehicles }: B2BInventoryHeaderProps) => {
  return (
    <PageHeader 
      title="Verkocht B2B" 
      description="Beheer uw verkochte voertuigen aan zakelijke klanten"
    >
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" disabled={selectedVehicles.length === 0}>
          <FileText className="h-4 w-4 mr-2" />
          Export selectie
        </Button>
        <Button variant="outline" size="sm" disabled={selectedVehicles.length === 0}>
          <Mail className="h-4 w-4 mr-2" />
          E-mail sturen
        </Button>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nieuw voertuig
        </Button>
      </div>
    </PageHeader>
  );
};
