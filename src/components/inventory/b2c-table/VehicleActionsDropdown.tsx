
import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Car, FileText, Check } from "lucide-react";
import { Vehicle, PaymentStatus } from "@/types/inventory";

interface VehicleActionsDropdownProps {
  vehicle: Vehicle;
  onSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onDeliveryConfirm: (vehicleId: string) => void;
  onMarkAsArrived?: (vehicleId: string) => void;
  onOpenContractConfig?: (vehicle: Vehicle, contractType: "b2b" | "b2c") => void;
}

export const VehicleActionsDropdown: React.FC<VehicleActionsDropdownProps> = ({
  vehicle,
  onSendEmail,
  handleChangeStatus,
  onDeliveryConfirm,
  onMarkAsArrived,
  onOpenContractConfig
}) => {
  // Check if vehicle is sold to determine if contract emails should be shown
  const isVehicleSold = vehicle.salesStatus === 'verkocht_b2b' || vehicle.salesStatus === 'verkocht_b2c';
  
  const handleContractAction = (contractType: "b2b" | "b2c") => {
    if (onOpenContractConfig) {
      onOpenContractConfig(vehicle, contractType);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>E-mail acties</DropdownMenuLabel>
        
        {/* Only show contract emails for sold vehicles */}
        {isVehicleSold && (
          <>
            <DropdownMenuItem onClick={() => handleContractAction("b2c")}>
              <FileText className="h-4 w-4 mr-2" />
              Stuur koopcontract B2C
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleContractAction("b2b")}>
              <FileText className="h-4 w-4 mr-2" />
              Stuur koopcontract B2B
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuItem onClick={() => onSendEmail("delivery_appointment", vehicle.id)}>
          <Mail className="h-4 w-4 mr-2" />
          Aflevering afspraak
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSendEmail("payment_reminder", vehicle.id)}>
          <Mail className="h-4 w-4 mr-2" />
          Betaalherinnering
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSendEmail("bpm_huys", vehicle.id)}>
          <Mail className="h-4 w-4 mr-2" />
          BPM Huys aanmelden
        </DropdownMenuItem>
        
        {!vehicle.arrived && onMarkAsArrived && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status acties</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onMarkAsArrived(vehicle.id)}>
              <Check className="h-4 w-4 mr-2" />
              Markeer als aangekomen
            </DropdownMenuItem>
          </>
        )}
        
        {handleChangeStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Verkoopstatus</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2b")}
              disabled={!vehicle.customerId || !vehicle.salespersonId}
            >
              Verkocht B2B
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2c")}
              disabled={!vehicle.customerId || !vehicle.salespersonId}
            >
              Verkocht Particulier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChangeStatus(vehicle.id, "voorraad")}>
              Terug naar voorraad
            </DropdownMenuItem>
          </>
        )}
        
        {vehicle.paymentStatus === "volledig_betaald" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDeliveryConfirm(vehicle.id)}>
              <Car className="h-4 w-4 mr-2" />
              Auto afgeleverd
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
