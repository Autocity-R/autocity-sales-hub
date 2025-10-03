
import React, { useState } from "react";
import { Mail, AlertCircle, CheckCircle, Truck, FileText, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { isButtonLinkedToTemplate } from "@/services/emailTemplateService";
import { ContractConfigDialog } from "../ContractConfigDialog";
import { EmailConfirmDialog } from "@/components/ui/email-confirm-dialog";

interface EmailsTabProps {
  vehicle: Vehicle;
  onSendEmail: (type: string, contractOptions?: ContractOptions) => void;
  onUpdateReminder: (type: 'papers_reminder', enabled: boolean) => void;
}

export const EmailsTab: React.FC<EmailsTabProps> = ({ onSendEmail, vehicle, onUpdateReminder }) => {
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractType, setContractType] = useState<"b2b" | "b2c">("b2b");
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [pendingEmailAction, setPendingEmailAction] = useState<{ type: string; options?: ContractOptions } | null>(null);
  
  const isB2B = vehicle?.salesStatus === "verkocht_b2b";
  const isVehicleArrived = vehicle?.arrived;

  const handleContractClick = (type: "b2b" | "b2c") => {
    setContractType(type);
    setContractDialogOpen(true);
  };

  const handleSendContract = (options: ContractOptions) => {
    const buttonType = contractType === "b2b" ? "contract_b2b" : "contract_send";
    setPendingEmailAction({ type: buttonType, options });
    setEmailConfirmOpen(true);
  };

  const handleConfirmEmail = () => {
    if (pendingEmailAction) {
      onSendEmail(pendingEmailAction.type, pendingEmailAction.options);
      setPendingEmailAction(null);
    }
  };

  const renderEmailButton = (buttonType: string, icon: React.ReactNode, label: string, variant: "default" | "outline" = "default") => {
    const hasTemplate = isButtonLinkedToTemplate(buttonType);
    const isContractButton = buttonType.includes("contract");
    
    const handleClick = () => {
      if (isContractButton) {
        // In B2B context, always use B2B contract type
        const type = (isB2B || buttonType.includes("b2b")) ? "b2b" : "b2c";
        handleContractClick(type);
      } else {
        setPendingEmailAction({ type: buttonType });
        setEmailConfirmOpen(true);
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
            
            {vehicle?.importStatus === "niet_aangemeld" && renderEmailButton(
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

              {renderEmailButton(
                "contract_send", 
                <FileText className="mr-2 h-4 w-4" />, 
                "Koopcontract sturen"
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
                  <div>• Aanvraag ontvangen - Initiële melding naar klant</div>
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
            <Checkbox 
              id="papers_reminder_enabled" 
              checked={(vehicle as any).emailReminderSettings?.papers_reminder_enabled || false}
              onCheckedChange={(checked) => onUpdateReminder('papers_reminder', checked as boolean)}
            />
            <Label htmlFor="papers_reminder_enabled">
              Na een week automatisch herinnering sturen als papieren niet binnen
            </Label>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            {!vehicle?.papersReceived && renderEmailButton(
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

      {/* Contract Configuration Dialog */}
      {vehicle && (
        <ContractConfigDialog
          isOpen={contractDialogOpen}
          onClose={() => setContractDialogOpen(false)}
          vehicle={vehicle}
          contractType={contractType}
          onSendContract={handleSendContract}
        />
      )}

      <EmailConfirmDialog
        open={emailConfirmOpen}
        onOpenChange={setEmailConfirmOpen}
        onConfirm={handleConfirmEmail}
        emailType={pendingEmailAction?.type}
        recipientInfo={vehicle?.customerContact?.email}
      />
    </div>
  );
};
