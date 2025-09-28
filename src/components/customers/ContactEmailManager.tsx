import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Send } from "lucide-react";
import { toast } from "sonner";

interface ContactEmailManagerProps {
  primaryEmail: string;
  additionalEmails: string[];
  onEmailsChange: (emails: string[]) => void;
  contactType: string;
  onSendCMR?: (emails: string[]) => void;
}

const ContactEmailManager: React.FC<ContactEmailManagerProps> = ({
  primaryEmail,
  additionalEmails = [],
  onEmailsChange,
  contactType,
  onSendCMR
}) => {
  const [newEmail, setNewEmail] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

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
    setSelectedEmails(selectedEmails.filter(email => email !== emailToRemove));
    toast.success("Email verwijderd");
  };

  const handleEmailSelection = (email: string, checked: boolean) => {
    if (checked) {
      setSelectedEmails([...selectedEmails, email]);
    } else {
      setSelectedEmails(selectedEmails.filter(e => e !== email));
    }
  };

  const handleSendCMR = () => {
    if (selectedEmails.length === 0) {
      toast.error("Selecteer ten minste één emailadres");
      return;
    }
    
    if (onSendCMR) {
      onSendCMR(selectedEmails);
      toast.success(`CMR document wordt verstuurd naar ${selectedEmails.length} emailadres(sen)`);
    }
  };

  const allEmails = [primaryEmail, ...additionalEmails];

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

        {/* CMR Document sending - only for suppliers */}
        {contactType === "supplier" && allEmails.length > 0 && (
          <div className="border-t pt-4 mt-6">
            <Label className="text-sm font-medium">CMR Document versturen</Label>
            <div className="space-y-3 mt-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Selecteer emailadressen om CMR document naar te versturen:
                </Label>
                {allEmails.map((email) => (
                  <div key={email} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`email-${email}`}
                      checked={selectedEmails.includes(email)}
                      onChange={(e) => handleEmailSelection(email, e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor={`email-${email}`} className="text-sm">
                      {email}
                      {email === primaryEmail && (
                        <span className="text-xs text-muted-foreground ml-1">(primair)</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={handleSendCMR}
                disabled={selectedEmails.length === 0}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                CMR Document versturen naar {selectedEmails.length} emailadres(sen)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactEmailManager;