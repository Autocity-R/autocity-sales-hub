
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, Trash2, Edit, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchLoanCars, 
  createLoanCar, 
  updateLoanCar, 
  deleteLoanCar, 
  toggleLoanCarAvailability 
} from "@/services/warrantyService";
import { LoanCar } from "@/types/warranty";
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

  // Fetch loan cars
  const { data: loanCars = [], isLoading } = useQuery({
    queryKey: ["loanCars"],
    queryFn: fetchLoanCars
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
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      toggleLoanCarAvailability(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loanCars"] });
      toast({
        title: "Status bijgewerkt",
        description: "De beschikbaarheidsstatus is bijgewerkt."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het bijwerken van de status.",
        variant: "destructive"
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
    const currentStatus = car.available ? 'beschikbaar' : 'uitgeleend';
    toggleMutation.mutate({ id: car.id, status: currentStatus });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Leenauto Beheer
              </CardTitle>
              <CardDescription>
                Beheer alle leenauto's en hun beschikbaarheid
              </CardDescription>
            </div>
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
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
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
                <div key={car.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Car className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {car.brand} {car.model}
                      </div>
                      <div className="text-sm text-gray-500">
                        Kenteken: {car.licenseNumber}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={car.available ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {car.available ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Beschikbaar
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Uitgeleend
                        </>
                      )}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAvailability(car)}
                    >
                      {car.available ? "Markeer als Uitgeleend" : "Markeer als Beschikbaar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCar(car)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
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
                            Deze actie kan niet ongedaan worden gemaakt.
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
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
