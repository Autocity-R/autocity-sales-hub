
import React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ContactsTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Contacten</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-md p-4 space-y-4">
          <h4 className="font-medium">Leverancier</h4>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer leverancier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto-schmidt">Auto Schmidt</SelectItem>
              <SelectItem value="deutsche-autos">Deutsche Autos GmbH</SelectItem>
              <SelectItem value="car-connect">Car Connect</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="pt-2">
            <Button variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" />
              Leverancier beheren
            </Button>
          </div>
        </div>
        
        <div className="border rounded-md p-4 space-y-4">
          <h4 className="font-medium">Klant</h4>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer klant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jansen">Fam. Jansen</SelectItem>
              <SelectItem value="pietersen">Dhr. Pietersen</SelectItem>
              <SelectItem value="de-boer">De Boer Auto's</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="pt-2">
            <Button variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" />
              Klant beheren
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
