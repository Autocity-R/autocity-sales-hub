
import React, { useState } from "react";
import { Mail, AlertCircle, CheckCircle, Calendar, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { isButtonLinkedToTemplate } from "@/services/emailTemplateService";
import { ContractConfigDialog } from "../ContractConfigDialog";

interface B2CEmailsTabProps {
  onSendEmail: (type: string, contractOptions?: ContractOptions) => void;
  vehicle?: Vehicle;
}

export const B2CEmailsTab: React.FC<B2CEmailsTabProps> = ({ onSendEmail, vehicle }) => {
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  
  const isB2C = vehicle?.salesStatus === "verkocht_b2c";
  const isVehicleArrived = vehicle?.arrived;

  const handleContractClick = () => {
    setContractDialogOpen(true);
  };

  const handleSendContract = (options: ContractOptions) => {
    onSendEmail("contract_b2c", options);
  };

  const renderEmailButton = (buttonType: string, icon: React.ReactNode, label: string, variant: "default" | "outline" = "default") => {
    const hasTemplate = isButtonLinkedToTemplate(buttonType);
    const isContractButton = buttonType.includes("contract");
    
    const handleClick = () => {
      if (isContractButton) {
        handleContractClick();
      } else {
        onSendEmail(buttonType);
      }
    };
    
    return (
      <Button 
        className="w-full justify-start" 
        variant={hasTemplate ? variant : "outline"}
        onClick={handleClick}
        disabled={!hasTemplate}
        title={hasTemplate ? `Verstuur: ${label}` : `Geen email template gekoppeld aan ${label}`}
      >
        {icon}
        {label}
        {!hasTemplate && <Settings className="ml-auto h-4 w-4 text-muted-foreground" />}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">E-mail functies</h3>
      
      {isB2C && (
        <div className="border rounded-md p-4">
          <h4 className="font-medium mb-4">Particuliere klant</h4>
          
          <div className="space-y-3">
            {renderEmailButton(
              "contract_b2c", 
              <Mail className="mr-2 h-4 w-4" />, 
              "Koopcontract sturen (B2C)"
            )}
            
            {renderEmailButton(
              "rdw_approved", 
              <CheckCircle className="mr-2 h-4 w-4" />, 
              "Auto is goedgekeurd door RDW"
            )}
            
            {renderEmailButton(
              "bpm_paid", 
              <CheckCircle className="mr-2 h-4 w-4" />, 
              "BPM is betaald"
            )}
            
            {renderEmailButton(
              "car_registered", 
              <CheckCircle className="mr-2 h-4 w-4" />, 
              "Auto is ingeschreven"
            )}
            
            {renderEmailButton(
              "delivery_appointment", 
              <Calendar className="mr-2 h-4 w-4" />, 
              "Aflevering: plan een afspraak"
            )}
            
            <div className="mt-2 p-3 bg-muted rounded-md">
              <h5 className="text-sm font-medium mb-2">Import status updates</h5>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>• RDW goedkeuring - Auto is klaar voor registratie</div>
                <div>• BPM Betaald - BPM betaald en registratie volgt</div>
                <div>• Auto Ingeschreven - Kenteken is toegekend</div>
                <div>• Aflevering - Plan een afspraak voor overdracht</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isVehicleArrived && (
        <div className="border rounded-md p-4">
          <h4 className="font-medium mb-4">Status updates</h4>
          
          <div className="space-y-3">
            {renderEmailButton(
              "vehicle_arrived", 
              <CheckCircle className="mr-2 h-4 w-4" />, 
              "Auto is binnengekomen"
            )}
            
            {renderEmailButton(
              "workshop_update", 
              <AlertCircle className="mr-2 h-4 w-4" />, 
              "Werkplaats update"
            )}
          </div>
        </div>
      )}
      
      <div className="border rounded-md p-4">
        <h4 className="font-medium mb-4">Documenten</h4>
        
        <div className="space-y-3">
          {renderEmailButton(
            "reminder_papers", 
            <FileText className="mr-2 h-4 w-4" />, 
            "Herinnering documenten"
          )}
        </div>
      </div>
      
      <div className="border rounded-md p-4">
        <h4 className="font-medium mb-4">Herinneringen</h4>
        
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox id="reminder_enabled" defaultChecked />
          <Label htmlFor="reminder_enabled">
            Na een week automatisch herinnering sturen als betaling uitblijft
          </Label>
        </div>
        
        <Separator className="my-4" />
        
        <div className="space-y-3">
          {renderEmailButton(
            "payment_reminder", 
            <Mail className="mr-2 h-4 w-4" />, 
            "Handmatig betalingsherinnering sturen",
            "outline"
          )}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md">
        <p className="font-medium mb-1">Let op:</p>
        <p>Knoppen met een ⚙️ icoon hebben nog geen email template gekoppeld. 
        Ga naar Instellingen → Email Templates om templates aan knoppen te koppelen.</p>
      </div>

      {/* Contract Configuration Dialog */}
      {vehicle && (
        <ContractConfigDialog
          isOpen={contractDialogOpen}
          onClose={() => setContractDialogOpen(false)}
          vehicle={vehicle}
          contractType="b2c"
          onSendContract={handleSendContract}
        />
      )}
    </div>
  );
};
