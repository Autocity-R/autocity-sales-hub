
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";

export const NewUserForm = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "user",
  });

  const createUserMutation = useMutation({
    mutationFn: ({ email, password, firstName, lastName, role }: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
    }) => createUser(email, password, firstName, lastName, role),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        toast({
          title: "Gebruiker toegevoegd",
          description: `${formData.firstName} ${formData.lastName} is toegevoegd aan het systeem.`,
        });
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          role: "user",
        });
      } else {
        toast({
          title: "Fout bij aanmaken",
          description: result.error || "Er is een fout opgetreden.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij aanmaken",
        description: error.message || "Er is een onbekende fout opgetreden.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.role) {
      toast({
        title: "Fout",
        description: "Vul alle verplichte velden in.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Fout",
        description: "Wachtwoord moet minimaal 6 karakters lang zijn.",
        variant: "destructive"
      });
      return;
    }

    createUserMutation.mutate({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
    });
  };

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Toegang geweigerd</h3>
        <p className="text-gray-600">Je hebt geen rechten om nieuwe gebruikers aan te maken.</p>
      </div>
    );
  }

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
            <Label htmlFor="password">Tijdelijk Wachtwoord *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Minimaal 6 karakters"
              required
              minLength={6}
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
                <SelectItem value="owner">Owner - Volledige toegang</SelectItem>
                <SelectItem value="admin">Admin - Volledige toegang</SelectItem>
                <SelectItem value="manager">Manager - Beheer en rapportages</SelectItem>
                <SelectItem value="verkoper">Verkoper - Verkoop en klanten</SelectItem>
                <SelectItem value="user">Gebruiker - Basis toegang</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createUserMutation.isPending}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {createUserMutation.isPending ? "Bezig met aanmaken..." : "Gebruiker Toevoegen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
