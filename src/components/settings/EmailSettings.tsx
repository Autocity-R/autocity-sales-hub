
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const EmailSettings = () => {
  const { toast } = useToast();
  const [emailAccounts, setEmailAccounts] = useState([
    {
      id: 1,
      email: "verkoper1@autodealerx.nl",
      provider: "Gmail",
      isActive: true,
      isPrimary: true
    },
    {
      id: 2,
      email: "info@autodealerx.nl",
      provider: "Outlook",
      isActive: true,
      isPrimary: false
    }
  ]);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleAddEmail = () => {
    if (!newEmail) return;
    
    const newAccount = {
      id: Date.now(),
      email: newEmail,
      provider: "Gmail",
      isActive: true,
      isPrimary: false
    };
    
    setEmailAccounts(prev => [...prev, newAccount]);
    setNewEmail("");
    setNewPassword("");
    
    toast({
      title: "Email account toegevoegd",
      description: `${newEmail} is succesvol gekoppeld.`,
    });
  };

  const handleRemoveEmail = (id: number) => {
    setEmailAccounts(prev => prev.filter(account => account.id !== id));
    toast({
      title: "Email account verwijderd",
      description: "Het email account is ontkoppeld.",
    });
  };

  const toggleEmailStatus = (id: number) => {
    setEmailAccounts(prev =>
      prev.map(account =>
        account.id === id ? { ...account, isActive: !account.isActive } : account
      )
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gekoppelde Email Accounts
          </CardTitle>
          <CardDescription>
            Beheer je email accounts voor klantcommunicatie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{account.email}</span>
                    {account.isPrimary && (
                      <Badge variant="default">Primair</Badge>
                    )}
                    <Badge variant={account.isActive ? "secondary" : "outline"}>
                      {account.isActive ? "Actief" : "Inactief"}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">{account.provider}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={account.isActive}
                  onCheckedChange={() => toggleEmailStatus(account.id)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveEmail(account.id)}
                  disabled={account.isPrimary}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nieuw Email Account Toevoegen
          </CardTitle>
          <CardDescription>
            Koppel een nieuw email account voor klantcommunicatie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">Email Adres</Label>
            <Input
              id="newEmail"
              type="email"
              placeholder="naam@bedrijf.nl"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Wachtwoord</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleAddEmail} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Email Account Toevoegen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
