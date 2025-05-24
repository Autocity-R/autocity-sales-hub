
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const NotificationSettings = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState({
    leadReminders: true,
    emailMentions: true,
    newLeads: true,
    appointmentReminders: true,
    systemUpdates: false,
    dailySummary: true,
    weeklyReports: false
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    toast({
      title: "Notificatie instellingen opgeslagen",
      description: "Je notificatie voorkeuren zijn bijgewerkt.",
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
            Beheer wanneer en hoe je notificaties ontvangt voor leads en systeem updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">Lead Beheer</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Lead Herinneringen</Label>
                <p className="text-sm text-gray-500">Ontvang herinneringen voor follow-up van leads</p>
              </div>
              <Switch
                checked={notifications.leadReminders}
                onCheckedChange={(checked) => handleNotificationChange("leadReminders", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Nieuwe Leads</Label>
                <p className="text-sm text-gray-500">Directe melding bij nieuwe lead registraties</p>
              </div>
              <Switch
                checked={notifications.newLeads}
                onCheckedChange={(checked) => handleNotificationChange("newLeads", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Afspraak Herinneringen</Label>
                <p className="text-sm text-gray-500">Herinneringen voor geplande afspraken</p>
              </div>
              <Switch
                checked={notifications.appointmentReminders}
                onCheckedChange={(checked) => handleNotificationChange("appointmentReminders", checked)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-4">Email Communicatie</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Vermeldingen</Label>
                <p className="text-sm text-gray-500">Notificaties wanneer je wordt vermeld in emails</p>
              </div>
              <Switch
                checked={notifications.emailMentions}
                onCheckedChange={(checked) => handleNotificationChange("emailMentions", checked)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-4">Rapportages</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Dagelijkse Samenvatting</Label>
                <p className="text-sm text-gray-500">Ontvang een dagelijkse samenvatting van activiteiten</p>
              </div>
              <Switch
                checked={notifications.dailySummary}
                onCheckedChange={(checked) => handleNotificationChange("dailySummary", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Wekelijkse Rapporten</Label>
                <p className="text-sm text-gray-500">Uitgebreide wekelijkse performance rapporten</p>
              </div>
              <Switch
                checked={notifications.weeklyReports}
                onCheckedChange={(checked) => handleNotificationChange("weeklyReports", checked)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-4">Systeem</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Systeem Updates</Label>
                <p className="text-sm text-gray-500">Notificaties over systeem onderhoud en updates</p>
              </div>
              <Switch
                checked={notifications.systemUpdates}
                onCheckedChange={(checked) => handleNotificationChange("systemUpdates", checked)}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            Notificatie Voorkeuren Opslaan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
