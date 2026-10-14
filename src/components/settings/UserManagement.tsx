
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Shield, Mail, Trash2, MoreHorizontal, Building2, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLE_OPTIONS, getRoleLabel } from "@/lib/roles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, updateUserRole, updateUsersBranch, updatePoetserType, UserProfile } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import { AddUserDialog } from "./AddUserDialog";
import { UserActivityIndicator } from "./UserActivityIndicator";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { UitDienstDialog, HeractiverenDialog } from "./UitDienstDialog";
import { getUserHistory } from "@/services/userService";
import { UserX, UserCheck } from "lucide-react";

type Branch = "rotterdam" | "heerhugowaard";
const BRANCH_LABEL: Record<Branch, string> = {
  rotterdam: "Rotterdam",
  heerhugowaard: "Heerhugowaard",
};

export const UserManagement = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<UserProfile | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [branchTarget, setBranchTarget] = useState<Branch | null>(null);
  const [isMovingBranch, setIsMovingBranch] = useState(false);

  const { data: allUsers = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
  });
  const [tab, setTab] = useState<"actief" | "uit_dienst">("actief");
  const [uitDienstUser, setUitDienstUser] = useState<UserProfile | null>(null);
  const [heractiverenUser, setHeractiverenUser] = useState<UserProfile | null>(null);
  const activeUsers = allUsers.filter((u: UserProfile) => u.actief !== false);
  const inactiveUsers = allUsers.filter((u: UserProfile) => u.actief === false);
  const users = tab === "actief" ? activeUsers : inactiveUsers;

  // Historie per medewerker: alleen zonder historie mag hard verwijderen
  const { data: historyMap = {} } = useQuery({
    queryKey: ["users", "historie", allUsers.map((u: UserProfile) => u.id).join(",")],
    enabled: allUsers.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(allUsers.map(async (u: UserProfile) => {
        try { return [u.id, Object.keys(await getUserHistory(u.id)).length > 0] as const; }
        catch { return [u.id, true] as const; }
      }));
      return Object.fromEntries(entries) as Record<string, boolean>;
    },
  });

  const poetserTypeMutation = useMutation({
    mutationFn: ({ userId, poetserType }: { userId: string; poetserType: "intern" | "extern" }) =>
      updatePoetserType(userId, poetserType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Poetser bijgewerkt", description: "Het poetser-type is aangepast." });
    },
    onError: () => {
      toast({ title: "Fout", description: "Poetser-type kon niet worden aangepast.", variant: "destructive" });
    },
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

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUserToDelete(user);
    setShowDeleteUserDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setSelectedUserToDelete(null);
    setShowDeleteUserDialog(false);
  };

  const toggleSelectUser = (id: string, checked: boolean) => {
    setSelectedUserIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(users.map((u: UserProfile) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleConfirmBranchMove = async () => {
    if (!branchTarget || selectedUserIds.length === 0) return;
    setIsMovingBranch(true);
    const { ok, fail } = await updateUsersBranch(selectedUserIds, branchTarget);
    setIsMovingBranch(false);
    setBranchTarget(null);
    await queryClient.invalidateQueries({ queryKey: ["users"] });

    if (ok > 0 && fail === 0) {
      toast({
        title: "Vestiging bijgewerkt",
        description: `${ok} gebruiker(s) verplaatst naar ${BRANCH_LABEL[branchTarget]}`,
      });
    } else if (ok > 0 && fail > 0) {
      toast({
        title: "Deels gelukt",
        description: `${ok} verplaatst, ${fail} mislukt`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verplaatsen mislukt",
        description: `${fail} gebruiker(s) konden niet worden bijgewerkt`,
        variant: "destructive",
      });
    }
    setSelectedUserIds([]);
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
                Gebruikersbeheer ({activeUsers.length})
              </CardTitle>
              <CardDescription>
                Beheer alle gebruikers in het systeem en hun toegangsrechten
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={selectedUserIds.length === 0}
                  >
                    <Building2 className="h-4 w-4" />
                    Verplaats naar vestiging ({selectedUserIds.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Doelvestiging</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setBranchTarget("rotterdam")}>
                    Rotterdam
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setBranchTarget("heerhugowaard")}>
                    Heerhugowaard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setShowAddUserDialog(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Nieuwe Gebruiker
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2" role="tablist">
              <Button size="sm" role="tab" aria-selected={tab === "actief"} variant={tab === "actief" ? "default" : "outline"} onClick={() => { setTab("actief"); setSelectedUserIds([]); }}>
                Actief ({activeUsers.length})
              </Button>
              <Button size="sm" role="tab" aria-selected={tab === "uit_dienst"} variant={tab === "uit_dienst" ? "default" : "outline"} onClick={() => { setTab("uit_dienst"); setSelectedUserIds([]); }}>
                Uit dienst ({inactiveUsers.length})
              </Button>
            </div>
            {tab === "actief" && users.length > 0 && (
              <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={
                    selectedUserIds.length === users.length && users.length > 0
                  }
                  onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                />
                <span>
                  {selectedUserIds.length > 0
                    ? `${selectedUserIds.length} geselecteerd`
                    : "Alles selecteren"}
                </span>
              </div>
            )}
            {users.map((user: UserProfile) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {tab === "actief" && <Checkbox
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={(v) =>
                      toggleSelectUser(user.id, Boolean(v))
                    }
                  />}
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
                      {user.uit_dienst_sinds && ` · uit dienst sinds ${new Date(user.uit_dienst_sinds).toLocaleDateString('nl-NL')}`}
                    </div>
                  </div>
                </div>
                {tab === "uit_dienst" ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Uit dienst</Badge>
                    <Button size="sm" variant="outline" onClick={() => setHeractiverenUser(user)}>
                      <UserCheck className="h-4 w-4 mr-1" />Heractiveren
                    </Button>
                  </div>
                ) : (
                <div className="flex items-center gap-2">
                  <UserActivityIndicator user={user} />
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {user.branch === "heerhugowaard"
                      ? "Heerhugowaard"
                      : user.branch === "rotterdam"
                      ? "Rotterdam"
                      : "—"}
                  </Badge>
                  <Badge variant={user.role === "admin" || user.role === "owner" ? "default" : "secondary"}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  {user.role === "poetser" && (
                    <Select
                      value={user.poetser_type || "intern"}
                      onValueChange={(value) =>
                        poetserTypeMutation.mutate({ userId: user.id, poetserType: value as "intern" | "extern" })
                      }
                      disabled={poetserTypeMutation.isPending}
                    >
                      <SelectTrigger className="w-28" aria-label="Poetser-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intern">Intern</SelectItem>
                        <SelectItem value="extern">Extern</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setUitDienstUser(user)}>
                        <UserX className="h-4 w-4 mr-2" />
                        Uit dienst zetten
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={historyMap[user.id] !== false}
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {historyMap[user.id] === false ? "Gebruiker Verwijderen" : "Verwijderen (heeft historie)"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                )}
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

      <UitDienstDialog user={uitDienstUser} colleagues={activeUsers} onClose={() => setUitDienstUser(null)} />
      <HeractiverenDialog user={heractiverenUser} onClose={() => setHeractiverenUser(null)} />

      <DeleteUserDialog
        open={showDeleteUserDialog}
        onClose={handleCloseDeleteDialog}
        user={selectedUserToDelete}
      />

      <AlertDialog
        open={branchTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isMovingBranch) setBranchTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gebruikers verplaatsen</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat op het punt om <b>{selectedUserIds.length}</b> gebruiker(s)
              te verplaatsen naar{" "}
              <b>{branchTarget ? BRANCH_LABEL[branchTarget] : ""}</b>. Hun
              standaardvestiging wordt aangepast; bestaande data blijft
              ongewijzigd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMovingBranch}>
              Annuleren
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmBranchMove();
              }}
              disabled={isMovingBranch}
            >
              {isMovingBranch ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Verplaatsen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
