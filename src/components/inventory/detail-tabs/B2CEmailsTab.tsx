
import React from "react";
import { Mail, AlertCircle, CheckCircle, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Vehicle } from "@/types/inventory";

interface B2CEmailsTabProps {
  onSendEmail: (type: string) => void;
  vehicle?: Vehicle;
}

export const B2CEmailsTab: React.FC<B2CEmailsTabProps> = ({ onSendEmail, vehicle }) => {
  const isB2C = vehicle?.salesStatus === "verkocht_b2c";
  const isVehicleArrived = vehicle?.arrived;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">E-mail functies</h3>
      
      {isB2C && (
        <div className="border rounded-md p-4">
          <h4 className="font-medium mb-4">Particuliere klant</h4>
          
          <div className="space-y-3">
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("contract_b2c")}
            >
              <Mail className="mr-2 h-4 w-4" />
              Koopcontract sturen
            </Button>
            
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("rdw_approved")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Auto is goedgekeurd door RDW
            </Button>
            
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("bpm_paid")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              BPM is betaald
            </Button>
            
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("car_registered")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Auto is ingeschreven
            </Button>
            
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("delivery_appointment")}
              variant="default"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Aflevering: plan een afspraak
            </Button>
            
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
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("vehicle_arrived")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Auto is binnengekomen
            </Button>
            
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("workshop_update")}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Werkplaats update
            </Button>
          </div>
        </div>
      )}
      
      <div className="border rounded-md p-4">
        <h4 className="font-medium mb-4">Documenten</h4>
        
        <div className="space-y-3">
          <Button 
            className="w-full justify-start" 
            onClick={() => onSendEmail("documents_reminder")}
          >
            <FileText className="mr-2 h-4 w-4" />
            Herinnering documenten
          </Button>
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
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => onSendEmail("payment_reminder")}
          >
            <Mail className="mr-2 h-4 w-4" />
            Handmatig betalingsherinnering sturen
          </Button>
        </div>
      </div>
    </div>
  );
};
