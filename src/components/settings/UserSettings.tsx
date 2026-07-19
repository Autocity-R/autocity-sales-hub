
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { EmailSettings } from "./EmailSettings";
import { AccountPreferences } from "./AccountPreferences";
import { UserManagement } from "./UserManagement";
import { NewUserForm } from "./NewUserForm";
import { SignatureSettings } from "./SignatureSettings";

export const UserSettings = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="personal">Persoonlijke Gegevens</TabsTrigger>
          <TabsTrigger value="signature">Handtekening</TabsTrigger>
          <TabsTrigger value="email">Email Instellingen</TabsTrigger>
          <TabsTrigger value="preferences">Voorkeuren</TabsTrigger>
          <TabsTrigger value="users">Gebruikers</TabsTrigger>
          <TabsTrigger value="new-user">Nieuwe Gebruiker</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="space-y-6">
          <PersonalInfoForm />
        </TabsContent>

        <TabsContent value="signature" className="space-y-6">
          <SignatureSettings />
        </TabsContent>
        
        <TabsContent value="email" className="space-y-6">
          <EmailSettings />
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-6">
          <AccountPreferences />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="new-user" className="space-y-6">
          <NewUserForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};
