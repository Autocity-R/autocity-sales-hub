import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface ContactEmailManagerProps {
  primaryEmail: string;
  additionalEmails: string[];
  onEmailsChange: (emails: string[]) => void;
}

const ContactEmailManager: React.FC<ContactEmailManagerProps> = ({
  primaryEmail,
  additionalEmails = [],
  onEmailsChange,
}) => {
  const [newEmail, setNewEmail] = useState("");

  const addEmail = () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Voer een geldig emailadres in");
      return;
    }
    
    if (additionalEmails.includes(newEmail) || newEmail === primaryEmail) {
      toast.error("Dit emailadres bestaat al");
      return;
    }

    const updatedEmails = [...additionalEmails, newEmail];
    onEmailsChange(updatedEmails);
    setNewEmail("");
    toast.success("Email toegevoegd");
  };

  const removeEmail = (emailToRemove: string) => {
    const updatedEmails = additionalEmails.filter(email => email !== emailToRemove);
    onEmailsChange(updatedEmails);
    toast.success("Email verwijderd");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Email Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary email display */}
        <div>
          <Label className="text-sm font-medium">Primair emailadres</Label>
          <div className="flex items-center space-x-2 mt-1">
            <Input value={primaryEmail} disabled className="flex-1" />
            <span className="text-xs text-muted-foreground">Primair</span>
          </div>
        </div>

        {/* Additional emails */}
        {additionalEmails.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Extra emailadressen</Label>
            <div className="space-y-2 mt-2">
              {additionalEmails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input value={email} disabled className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeEmail(email)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new email */}
        <div>
          <Label className="text-sm font-medium">Nieuw emailadres toevoegen</Label>
          <div className="flex space-x-2 mt-1">
            <Input
              type="email"
              placeholder="naam@bedrijf.nl"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addEmail()}
            />
            <Button onClick={addEmail} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Toevoegen
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default ContactEmailManager;