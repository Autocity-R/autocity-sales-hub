
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Shield, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, updateUserRole, UserProfile } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import { AddUserDialog } from "./AddUserDialog";
import { UserActivityIndicator } from "./UserActivityIndicator";

export const UserManagement = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: string }) =>
      updateUserRole(userId, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Rol bijgewerkt",
        description: "De gebruikersrol is succesvol aangepast.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message || "Er is een fout opgetreden bij het bijwerken van de rol.",
        variant: "destructive",
      });
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Toegang geweigerd</h3>
        <p className="text-gray-600">Je hebt geen rechten om gebruikers te beheren.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-red-600 mb-2">Fout bij laden</h3>
        <p className="text-gray-600">Er is een fout opgetreden bij het laden van gebruikers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gebruikersbeheer ({users.length})
              </CardTitle>
              <CardDescription>
                Beheer alle gebruikers in het systeem en hun toegangsrechten
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowAddUserDialog(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Nieuwe Gebruiker
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user: UserProfile) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      Aangemaakt: {new Date(user.created_at).toLocaleDateString('nl-NL')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UserActivityIndicator user={user} />
                  <Badge variant={user.role === "admin" || user.role === "owner" ? "default" : "secondary"}>
                    {user.role === "admin" ? "Admin" : 
                     user.role === "owner" ? "Owner" :
                     user.role === "manager" ? "Manager" :
                     user.role === "verkoper" ? "Verkoper" : "Gebruiker"}
                  </Badge>
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="verkoper">Verkoper</SelectItem>
                      <SelectItem value="user">Gebruiker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Geen gebruikers gevonden.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddUserDialog 
        open={showAddUserDialog}
        onClose={() => setShowAddUserDialog(false)}
      />
    </div>
  );
};
