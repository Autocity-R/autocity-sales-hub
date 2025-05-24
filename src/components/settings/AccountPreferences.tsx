
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Globe, Palette, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AccountPreferences = () => {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    leadNotifications: true,
    language: "nl",
    theme: "light",
    timezone: "Europe/Amsterdam",
    autoFollowUp: true,
    dealershipAccess: true
  });

  const handlePreferenceChange = (key: string, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    toast({
      title: "Voorkeuren opgeslagen",
      description: "Je accountvoorkeuren zijn succesvol bijgewerkt.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificatie Instellingen
          </CardTitle>
          <CardDescription>
            Beheer hoe en wanneer je notificaties ontvangt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notificaties</Label>
              <p className="text-sm text-gray-500">Ontvang notificaties via email</p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => handlePreferenceChange("emailNotifications", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Push Notificaties</Label>
              <p className="text-sm text-gray-500">Ontvang directe meldingen in de browser</p>
            </div>
            <Switch
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) => handlePreferenceChange("pushNotifications", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Lead Notificaties</Label>
              <p className="text-sm text-gray-500">Krijg meldingen bij nieuwe leads</p>
            </div>
            <Switch
              checked={preferences.leadNotifications}
              onCheckedChange={(checked) => handlePreferenceChange("leadNotifications", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regio & Taal Instellingen
          </CardTitle>
          <CardDescription>
            Stel je taal- en regiovoorkeuren in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Taal</Label>
            <Select
              value={preferences.language}
              onValueChange={(value) => handlePreferenceChange("language", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Tijdzone</Label>
            <Select
              value={preferences.timezone}
              onValueChange={(value) => handlePreferenceChange("timezone", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Amsterdam">Amsterdam (GMT+1)</SelectItem>
                <SelectItem value="Europe/Brussels">Brussels (GMT+1)</SelectItem>
                <SelectItem value="Europe/Berlin">Berlin (GMT+1)</SelectItem>
                <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Systeem Voorkeuren
          </CardTitle>
          <CardDescription>
            Configureer systeemgedrag en automatische functies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatische Follow-up</Label>
              <p className="text-sm text-gray-500">Automatisch herinneringen aanmaken voor leads</p>
            </div>
            <Switch
              checked={preferences.autoFollowUp}
              onCheckedChange={(checked) => handlePreferenceChange("autoFollowUp", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Dealer Toegang</Label>
              <p className="text-sm text-gray-500">Toegang tot alle dealer functionaliteiten</p>
            </div>
            <Switch
              checked={preferences.dealershipAccess}
              onCheckedChange={(checked) => handlePreferenceChange("dealershipAccess", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Alle Voorkeuren Opslaan
      </Button>
    </div>
  );
};
