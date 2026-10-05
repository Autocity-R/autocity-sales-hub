
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, Trash2, Edit, Ban, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchLoanCars, 
  createLoanCar, 
  updateLoanCar, 
  deleteLoanCar, 
  setLoanCarAvailability,
  addStockCarAsLoanCar,
  deactivateLoanCar,
  searchStockVehicles,
} from "@/services/loanCarService";
import { LoanCar } from "@/types/warranty";
import { LoanCarRow } from "@/components/leenauto/LoanCarRow";
import { fetchUitleningen } from "@/services/leenautoService";
import { useAuth } from "@/contexts/AuthContext";
import { canWriteLeenautoRole, canManageLeenautoRole } from "@/lib/routeAccess";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const LoanCarManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCar, setEditingCar] = useState<LoanCar | null>(null);
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    licenseNumber: ""
  });

  const { userRole, isAdmin } = useAuth();
  const canManage = isAdmin || canManageLeenautoRole(userRole);
  const [showInactive, setShowInactive] = useState(false);
  const [mode, setMode] = useState<"eigen" | "voorraad">("eigen");
  const [stockQ, setStockQ] = useState("");
  const { data: stockResults = [] } = useQuery({
    queryKey: ["leenauto-stock-search", stockQ],
    enabled: showAddForm && mode === "voorraad" && stockQ.trim().length >= 2,
    queryFn: () => searchStockVehicles(stockQ),
  });
  // Uitlenen/innemen: zelfde rollen als de database (leenauto_mag_schrijven)
  const canWriteLoans = canWriteLeenautoRole(userRole);
  const { data: uitleningen = [] } = useQuery({
    queryKey: ["leenautoUitleningen"],
    queryFn: () => fetchUitleningen(),
  });
  const refreshLoans = () => {
    queryClient.invalidateQueries({ queryKey: ["loanCars"] });
    queryClient.invalidateQueries({ queryKey: ["leenautoUitleningen"] });
  };

  // Fetch loan cars
  const { data: loanCars = [], isLoading } = useQuery({
    queryKey: ["loanCars", showInactive],
    queryFn: () => fetchLoanCars(showInactive)
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createLoanCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loanCars"] });
      toast({
        title: "Leenauto toegevoegd",
        description: "De leenauto is succesvol toegevoegd."
      });
      resetForm();
      setShowAddForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het toevoegen.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, vehicleId, data }: { id: string; vehicleId: string; data: any }) =>
      updateLoanCar(id, vehicleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loanCars"] });
      toast({
        title: "Leenauto bijgewerkt",
        description: "De leenauto is succesvol bijgewerkt."
      });
      resetForm();
      setShowAddForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het bijwerken.",
        variant: "destructive"
      });
    }
  });

  const stockMutation = useMutation({
    mutationFn: addStockCarAsLoanCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loanCars"] });
      queryClient.invalidateQueries({ queryKey: ["tijdelijkeLeenautos"] });
      toast({ title: "Voorraadauto toegevoegd als leenauto", description: "De auto blijft gewoon in de voorraad." });
      resetForm();
      setShowAddForm(false);
    },
    onError: (error: any) => toast({ title: "Toevoegen mislukt", description: error.message, variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateLoanCar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loanCars"] });
      queryClient.invalidateQueries({ queryKey: ["tijdelijkeLeenautos"] });
      toast({ title: "Niet meer als leenauto", description: "De historie blijft bewaard in Leenauto historie." });
    },
    onError: (error: any) => toast({ title: "Lukt niet", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, vehicleId }: { id: string; vehicleId: string }) =>
      deleteLoanCar(id, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loanCars"] });
      toast({
        title: "Leenauto verwijderd",
        description: "De leenauto is succesvol verwijderd."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het verwijderen.",
        variant: "destructive"
      });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, makeAvailable }: { id: string; makeAvailable: boolean }) =>
      setLoanCarAvailability(id, makeAvailable),
    onMutate: async ({ id, makeAvailable }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["loanCars"] });

      // Snapshot the previous value
      const previousLoanCars = queryClient.getQueryData(["loanCars"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["loanCars"], (old: LoanCar[] | undefined) => {
        if (!old) return old;
        return old.map(car => 
          car.id === id ? { ...car, available: makeAvailable } : car
        );
      });

      // Return a context object with the snapshotted value
      return { previousLoanCars };
    },
    onError: (error: any, _variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousLoanCars) {
        queryClient.setQueryData(["loanCars"], context.previousLoanCars);
      }
      toast({
        title: "Fout bij status bijwerken",
        description: error.message || "Kon de status niet bijwerken. Controleer je rechten.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["loanCars"] });
    },
    onSuccess: () => {
      toast({
        title: "Status bijgewerkt",
        description: "De beschikbaarheidsstatus is succesvol bijgewerkt."
      });
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      brand: "",
      model: "",
      licenseNumber: ""
    });
    setEditingCar(null);
    setMode("eigen");
    setStockQ("");
  };

  const handleAddCar = () => {
    if (!formData.brand || !formData.model || !formData.licenseNumber) {
      toast({
        title: "Fout",
        description: "Vul alle velden in.",
        variant: "destructive"
      });
      return;
    }

    createMutation.mutate({
      brand: formData.brand,
      model: formData.model,
      licenseNumber: formData.licenseNumber
    });
  };

  const handleEditCar = (car: LoanCar) => {
    setEditingCar(car);
    setFormData({
      brand: car.brand,
      model: car.model,
      licenseNumber: car.licenseNumber
    });
    setShowAddForm(true);
  };

  const handleUpdateCar = () => {
    if (!formData.brand || !formData.model || !formData.licenseNumber || !editingCar?.vehicleId) {
      toast({
        title: "Fout",
        description: "Vul alle velden in.",
        variant: "destructive"
      });
      return;
    }

    updateMutation.mutate({
      id: editingCar.id,
      vehicleId: editingCar.vehicleId,
      data: {
        brand: formData.brand,
        model: formData.model,
        licenseNumber: formData.licenseNumber
      }
    });
  };

  const handleDeleteCar = (car: LoanCar) => {
    deleteMutation.mutate({ id: car.id, vehicleId: car.vehicleId || '' });
  };

  const toggleAvailability = (car: LoanCar) => {
    const makeAvailable = !car.available;
    toggleMutation.mutate({ id: car.id, makeAvailable });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Leenauto Beheer
              </CardTitle>
              <CardDescription>
                Beheer alle leenauto's en hun beschikbaarheid
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/loan-cars/historie"><History className="h-4 w-4 mr-2" />Leenauto historie</Link>
            </Button>
            {canManage && (
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Leenauto Toevoegen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCar ? "Leenauto Bewerken" : "Nieuwe Leenauto Toevoegen"}
                  </DialogTitle>
                </DialogHeader>
                {!editingCar && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button type="button" variant={mode === "eigen" ? "default" : "outline"} onClick={() => setMode("eigen")}>Nieuwe eigen leenauto</Button>
                    <Button type="button" variant={mode === "voorraad" ? "default" : "outline"} onClick={() => setMode("voorraad")}>Auto uit voorraad</Button>
                  </div>
                )}
                {!editingCar && mode === "voorraad" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">De auto blijft in de voorraad en op de website; hij krijgt alleen het label "Tijdelijk leenauto".</p>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="stock-search" className="pl-8" placeholder="Kenteken, merk of model…" value={stockQ} onChange={(e) => setStockQ(e.target.value)} />
                    </div>
                    <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
                      {stockQ.trim().length < 2 ? (
                        <p className="p-3 text-sm text-muted-foreground">Typ minstens 2 tekens.</p>
                      ) : stockResults.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">Geen voorraadauto gevonden.</p>
                      ) : stockResults.map((v) => (
                        <button key={v.id} type="button" disabled={stockMutation.isPending}
                          onClick={() => stockMutation.mutate(v.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          data-testid={`stock-pick-${v.license_number}`}>
                          <div className="font-medium">{v.brand} {v.model}</div>
                          <div className="text-xs text-muted-foreground">{v.license_number || "—"} · {v.status}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Merk</Label>
                    <Input
                      id="brand"
                      placeholder="bijv. Volkswagen"
                      value={formData.brand}
                      onChange={(e) => handleInputChange("brand", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      placeholder="bijv. Polo"
                      value={formData.model}
                      onChange={(e) => handleInputChange("model", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Kenteken</Label>
                    <Input
                      id="licenseNumber"
                      placeholder="bijv. LN-001-X"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={editingCar ? handleUpdateCar : handleAddCar}
                      className="flex-1"
                    >
                      {editingCar ? "Bijwerken" : "Toevoegen"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddForm(false)}
                    >
                      Annuleren
                    </Button>
                  </div>
                </div>
                )}
              </DialogContent>
            </Dialog>
            )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Checkbox checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
            Toon ook leenauto's die niet meer gebruikt worden
          </label>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Leenauto's laden...</div>
            </div>
          ) : loanCars.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <div className="text-gray-500">Nog geen leenauto's toegevoegd</div>
            </div>
          ) : (
            <div className="space-y-4">
              {loanCars.map((car) => (
                <LoanCarRow
                  key={car.id}
                  car={car}
                  uitleningen={uitleningen.filter((u) => u.loan_car_id === car.id)}
                  canWrite={canWriteLoans}
                  onChanged={refreshLoans}
                  actions={!canManage ? null : car.actief === false ? (
                    <Badge variant="secondary">Niet meer in gebruik</Badge>
                  ) : <>
                    {car.bron === "voorraad" && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Tijdelijk (voorraad)</Badge>}
                    {car.bron !== "voorraad" && (
                      <Button variant="outline" size="sm" onClick={() => handleEditCar(car)} title="Bewerken">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" title="Niet meer als leenauto gebruiken" data-testid={`deactivate-${car.licenseNumber}`}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Niet meer als leenauto gebruiken?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {car.brand} {car.model} ({car.licenseNumber}) verdwijnt uit dit overzicht. De uitleenhistorie blijft bewaard en vindbaar in Leenauto historie en "Wie reed er?".
                            {car.bron === "voorraad" ? " De auto blijft gewoon in de voorraad." : ""}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deactivateMutation.mutate(car.id)}>Niet meer gebruiken</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {isAdmin && car.bron !== "voorraad" && (<AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Leenauto Verwijderen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je {car.brand} {car.model} ({car.licenseNumber}) wilt verwijderen?
                            Een leenauto met uitleenhistorie kan niet verwijderd worden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCar(car)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>)}
                  </>}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
