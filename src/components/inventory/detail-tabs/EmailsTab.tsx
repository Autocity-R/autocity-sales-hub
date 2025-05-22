
import React from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Vehicle } from "@/types/inventory";

interface EmailsTabProps {
  onSendEmail: (type: string) => void;
  vehicle?: Vehicle;  // Added vehicle prop
}

export const EmailsTab: React.FC<EmailsTabProps> = ({ onSendEmail, vehicle }) => {
  const isB2B = vehicle?.salesStatus === "verkocht_b2b";
  const isVehicleArrived = vehicle?.arrived;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">E-mail functies</h3>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="border rounded-md p-4">
          <h4 className="font-medium mb-4">Transport & Documenten</h4>
          
          <div className="space-y-3">
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("transport_pickup")}
            >
              <Mail className="mr-2 h-4 w-4" />
              Transport pickup document sturen
            </Button>
            
            <Button 
              className="w-full justify-start" 
              onClick={() => onSendEmail("cmr_supplier")}
            >
              <Mail className="mr-2 h-4 w-4" />
              CMR voor leverancier
            </Button>
          </div>
        </div>
        
        {isB2B && (
          <div className="border rounded-md p-4">
            <h4 className="font-medium mb-4">Zakelijke klant</h4>
            
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                onClick={() => onSendEmail("contract_b2b")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Koopcontract sturen
              </Button>
              
              {isVehicleArrived && (
                <Button 
                  className="w-full justify-start" 
                  onClick={() => onSendEmail("vehicle_arrived")}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Auto is binnengekomen
                </Button>
              )}
              
              <Button 
                className="w-full justify-start" 
                onClick={() => onSendEmail("license_registration")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Kenteken aanmelding update
              </Button>
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
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => onSendEmail("reminder_papers")}
            >
              <Mail className="mr-2 h-4 w-4" />
              Handmatig herinnering sturen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
