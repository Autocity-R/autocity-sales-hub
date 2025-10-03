
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreHorizontal, Mail, Car, FileText, Check, AlertCircle } from "lucide-react";
import { Vehicle, PaymentStatus } from "@/types/inventory";
import { toast } from "sonner";
import { EmailConfirmDialog } from "@/components/ui/email-confirm-dialog";

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
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [pendingEmailAction, setPendingEmailAction] = useState<{ type: string; vehicleId: string } | null>(null);
  
  // Check if vehicle is sold to determine if contract emails should be shown
  const isVehicleSold = vehicle.salesStatus === 'verkocht_b2b' || vehicle.salesStatus === 'verkocht_b2c';
  
  // Check if vehicle has customer linked
  const hasCustomer = !!(vehicle.customerId || vehicle.customerContact);
  const hasValidCustomerEmail = !!(vehicle.customerContact?.email && vehicle.customerContact.email.includes('@'));
  
  const handleContractAction = (contractType: "b2b" | "b2c") => {
    if (onOpenContractConfig) {
      onOpenContractConfig(vehicle, contractType);
    }
  };
  
  const handleEmailClick = (emailType: string, vehicleId: string) => {
    setPendingEmailAction({ type: emailType, vehicleId });
    setEmailConfirmOpen(true);
  };
  
  const handleConfirmEmail = () => {
    if (pendingEmailAction) {
      handleEmailWithValidation(pendingEmailAction.type, pendingEmailAction.vehicleId);
      setPendingEmailAction(null);
    }
  };
  
  const handleEmailWithValidation = (emailType: string, vehicleId: string) => {
    // Validate customer exists for customer emails
    const customerEmailTypes = ["delivery_appointment", "payment_reminder", "contract_b2b", "contract_b2c", "auto_gereed", "happy_call", "license_registration"];
    
    if (customerEmailTypes.includes(emailType)) {
      if (!hasCustomer) {
        toast.error("Geen klant gekoppeld", {
          description: "Koppel eerst een klant aan dit voertuig voordat u de email verstuurt."
        });
        return;
      }
      
      if (!hasValidCustomerEmail) {
        toast.error("Ongeldig emailadres", {
          description: "De klant heeft geen geldig emailadres. Update de klantgegevens."
        });
        return;
      }
    }
    
    onSendEmail(emailType, vehicleId);
  };
  
  return (
    <>
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
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenuItem 
                  onClick={() => handleEmailClick("delivery_appointment", vehicle.id)}
                  disabled={!hasCustomer || !hasValidCustomerEmail}
                  className={!hasCustomer || !hasValidCustomerEmail ? "opacity-50" : ""}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Aflevering afspraak
                  {(!hasCustomer || !hasValidCustomerEmail) && <AlertCircle className="h-3 w-3 ml-auto text-amber-500" />}
                </DropdownMenuItem>
              </div>
            </TooltipTrigger>
            {(!hasCustomer || !hasValidCustomerEmail) && (
              <TooltipContent>
                <p>{!hasCustomer ? "Koppel eerst een klant" : "Klant heeft geen geldig emailadres"}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenuItem 
                  onClick={() => handleEmailClick("payment_reminder", vehicle.id)}
                  disabled={!hasCustomer || !hasValidCustomerEmail}
                  className={!hasCustomer || !hasValidCustomerEmail ? "opacity-50" : ""}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Betaalherinnering
                  {(!hasCustomer || !hasValidCustomerEmail) && <AlertCircle className="h-3 w-3 ml-auto text-amber-500" />}
                </DropdownMenuItem>
              </div>
            </TooltipTrigger>
            {(!hasCustomer || !hasValidCustomerEmail) && (
              <TooltipContent>
                <p>{!hasCustomer ? "Koppel eerst een klant" : "Klant heeft geen geldig emailadres"}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenuItem 
                  onClick={() => handleEmailClick("license_registration", vehicle.id)}
                  disabled={!hasCustomer || !hasValidCustomerEmail}
                  className={!hasCustomer || !hasValidCustomerEmail ? "opacity-50" : ""}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Kenteken update
                  {(!hasCustomer || !hasValidCustomerEmail) && <AlertCircle className="h-3 w-3 ml-auto text-amber-500" />}
                </DropdownMenuItem>
              </div>
            </TooltipTrigger>
            {(!hasCustomer || !hasValidCustomerEmail) && (
              <TooltipContent>
                <p>{!hasCustomer ? "Koppel eerst een klant" : "Klant heeft geen geldig emailadres"}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenuItem onClick={() => handleEmailClick("bpm_huys", vehicle.id)}>
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

    <EmailConfirmDialog
      open={emailConfirmOpen}
      onOpenChange={setEmailConfirmOpen}
      onConfirm={handleConfirmEmail}
      emailType={pendingEmailAction?.type}
      recipientInfo={vehicle.customerContact?.email}
    />
  </>
  );
};
