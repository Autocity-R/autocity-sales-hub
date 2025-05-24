
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { EmailSettings } from "./EmailSettings";
import { AccountPreferences } from "./AccountPreferences";

export const UserSettings = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Persoonlijke Gegevens</TabsTrigger>
          <TabsTrigger value="email">Email Instellingen</TabsTrigger>
          <TabsTrigger value="preferences">Voorkeuren</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="space-y-6">
          <PersonalInfoForm />
        </TabsContent>
        
        <TabsContent value="email" className="space-y-6">
          <EmailSettings />
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-6">
          <AccountPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
};
