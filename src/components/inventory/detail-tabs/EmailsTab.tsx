
import React from "react";
import { Mail, AlertCircle, CheckCircle, Truck, FileText, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Vehicle } from "@/types/inventory";
import { isButtonLinkedToTemplate } from "@/services/emailTemplateService";

interface EmailsTabProps {
  onSendEmail: (type: string) => void;
  vehicle?: Vehicle;
}

export const EmailsTab: React.FC<EmailsTabProps> = ({ onSendEmail, vehicle }) => {
  const isB2B = vehicle?.salesStatus === "verkocht_b2b";
  const isVehicleArrived = vehicle?.arrived;

  const renderEmailButton = (buttonType: string, icon: React.ReactNode, label: string, variant: "default" | "outline" = "default") => {
    const hasTemplate = isButtonLinkedToTemplate(buttonType);
    
    return (
      <Button 
        className="w-full justify-start" 
        variant={hasTemplate ? variant : "outline"}
        onClick={() => onSendEmail(buttonType)}
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
      
      <div className="grid grid-cols-1 gap-4">
        <div className="border rounded-md p-4">
          <h4 className="font-medium mb-4">Transport & Documenten</h4>
          
          <div className="space-y-3">
            {renderEmailButton(
              "transport_pickup", 
              <Truck className="mr-2 h-4 w-4" />, 
              "Transport pickup document sturen"
            )}
            
            {renderEmailButton(
              "cmr_supplier", 
              <FileText className="mr-2 h-4 w-4" />, 
              "CMR voor Leverancier"
            )}
            
            {renderEmailButton(
              "bpm_huys", 
              <Mail className="mr-2 h-4 w-4" />, 
              "BPM Huys aanmelden"
            )}
          </div>
        </div>
        
        {isB2B && (
          <div className="border rounded-md p-4">
            <h4 className="font-medium mb-4">Zakelijke klant</h4>
            
            <div className="space-y-3">
              {renderEmailButton(
                "contract_b2b", 
                <Mail className="mr-2 h-4 w-4" />, 
                "Koopcontract sturen (B2B)"
              )}
              
              {isVehicleArrived && renderEmailButton(
                "vehicle_arrived", 
                <CheckCircle className="mr-2 h-4 w-4" />, 
                "Auto is binnengekomen"
              )}
              
              {renderEmailButton(
                "license_registration", 
                <AlertCircle className="mr-2 h-4 w-4" />, 
                "Kenteken aanmelding update"
              )}
              
              <div className="mt-2 p-3 bg-muted rounded-md">
                <h5 className="text-sm font-medium mb-2">Kenteken registratie updates</h5>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>• Aangemeld - Initiële melding naar klant</div>
                  <div>• Goedgekeurd - RDW heeft voertuig goedgekeurd</div>
                  <div>• BPM Betaald - BPM betaald en registratie volgt</div>
                  <div>• Herkeuring - Voertuig moet opnieuw worden gekeurd</div>
                  <div>• Ingeschreven - Kenteken is toegekend en klaar</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="border rounded-md p-4">
          <h4 className="font-medium mb-4">Herinneringen</h4>
          
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox id="reminder_enabled" defaultChecked />
            <Label htmlFor="reminder_enabled">
              Na een week automatisch herinnering sturen als papieren niet binnen
            </Label>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            {renderEmailButton(
              "reminder_papers", 
              <Mail className="mr-2 h-4 w-4" />, 
              "Handmatig herinnering sturen",
              "outline"
            )}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md">
          <p className="font-medium mb-1">Let op:</p>
          <p>Knoppen met een ⚙️ icoon hebben nog geen email template gekoppeld. 
          Ga naar Instellingen → Email Templates om templates aan knoppen te koppelen.</p>
        </div>
      </div>
    </div>
  );
};
