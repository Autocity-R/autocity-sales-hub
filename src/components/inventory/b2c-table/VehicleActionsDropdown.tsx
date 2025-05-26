
import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Car } from "lucide-react";
import { Vehicle, PaymentStatus } from "@/types/inventory";

interface VehicleActionsDropdownProps {
  vehicle: Vehicle;
  onSendEmail: (type: string, vehicleId: string) => void;
  handleChangeStatus?: (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad') => void;
  onDeliveryConfirm: (vehicleId: string) => void;
}

export const VehicleActionsDropdown: React.FC<VehicleActionsDropdownProps> = ({
  vehicle,
  onSendEmail,
  handleChangeStatus,
  onDeliveryConfirm
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSendEmail("contract_b2c", vehicle.id)}>
          <Mail className="h-4 w-4 mr-2" />
          Stuur koopcontract
        </DropdownMenuItem>
        
        {handleChangeStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Verkoopstatus</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2b")}>
              Verkocht B2B
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChangeStatus(vehicle.id, "verkocht_b2c")}>
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
