
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Shield, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john@autodealerx.nl",
      role: "Admin",
      status: "Actief",
      lastLogin: "2024-01-15"
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@autodealerx.nl",
      role: "Verkoper",
      status: "Actief",
      lastLogin: "2024-01-14"
    }
  ]);

  const handleRoleChange = (userId: number, newRole: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
    toast({
      title: "Rol bijgewerkt",
      description: "De gebruikersrol is succesvol aangepast.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gebruikersbeheer
          </CardTitle>
          <CardDescription>
            Beheer alle gebruikers in het systeem en hun toegangsrechten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      Laatst ingelogd: {user.lastLogin}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.status === "Actief" ? "default" : "secondary"}>
                    {user.status}
                  </Badge>
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Verkoper">Verkoper</SelectItem>
                      <SelectItem value="Gebruiker">Gebruiker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
