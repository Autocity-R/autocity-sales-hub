
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const NewUserForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    sendInvite: true
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
      toast({
        title: "Fout",
        description: "Vul alle verplichte velden in.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Gebruiker toegevoegd",
      description: `${formData.firstName} ${formData.lastName} is toegevoegd aan het systeem.`,
    });

    // Reset form
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      sendInvite: true
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Nieuwe Gebruiker Toevoegen
        </CardTitle>
        <CardDescription>
          Voeg een nieuwe gebruiker toe aan het systeem en stel toegangsrechten in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Voornaam *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Voornaam"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Achternaam *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Achternaam"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Adres *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="gebruiker@bedrijf.nl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Gebruikersrol *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange("role", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin - Volledige toegang</SelectItem>
                <SelectItem value="Manager">Manager - Beheer en rapportages</SelectItem>
                <SelectItem value="Verkoper">Verkoper - Verkoop en klanten</SelectItem>
                <SelectItem value="Gebruiker">Gebruiker - Basis toegang</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            Gebruiker Toevoegen
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
