
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, Trash2, Edit, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchLoanCars } from "@/services/warrantyService";
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

    // Mock adding car - in real app this would call an API
    toast({
      title: "Leenauto toegevoegd",
      description: `${formData.brand} ${formData.model} (${formData.licenseNumber}) is toegevoegd.`,
    });

    resetForm();
    setShowAddForm(false);
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
    if (!formData.brand || !formData.model || !formData.licenseNumber) {
      toast({
        title: "Fout",
        description: "Vul alle velden in.",
        variant: "destructive"
      });
      return;
    }

    // Mock updating car - in real app this would call an API
    toast({
      title: "Leenauto bijgewerkt",
      description: `${formData.brand} ${formData.model} is bijgewerkt.`,
    });

    resetForm();
    setShowAddForm(false);
  };

  const handleDeleteCar = (car: LoanCar) => {
    // Mock deleting car - in real app this would call an API
    toast({
      title: "Leenauto verwijderd",
      description: `${car.brand} ${car.model} (${car.licenseNumber}) is verwijderd.`,
    });
  };

  const toggleAvailability = (car: LoanCar) => {
    // Mock toggling availability - in real app this would call an API
    const newStatus = car.available ? "uitgeleend" : "beschikbaar";
    toast({
      title: "Status bijgewerkt",
      description: `${car.brand} ${car.model} is nu ${newStatus}.`,
    });
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
                          <AlertDialogAction onClick={() => handleDeleteCar(car)}>
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
