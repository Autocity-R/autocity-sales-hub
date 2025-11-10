
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableVehicleSelector } from "@/components/warranty/SearchableVehicleSelector";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Task, TaskPriority, TaskCategory, DamagePart } from "@/types/tasks";
import { fetchEmployees, createTask, updateTask } from "@/services/taskService";
import { fetchVehicles } from "@/services/inventoryService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { VehicleDamageSelector } from "./VehicleDamageSelector";

interface TaskFormProps {
  task?: Task | null;
  onClose: () => void;
  onTaskAdded: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, onClose, onTaskAdded }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    assignedTo: task?.assignedTo || "",
    vehicleId: task?.vehicleId || "",
    dueDate: task?.dueDate ? new Date(task.dueDate) : new Date(),
    priority: (task?.priority || "normaal") as TaskPriority,
    category: (task?.category || "voorbereiding") as TaskCategory,
    location: task?.location || "",
    estimatedDuration: task?.estimatedDuration || 60,
    notes: task?.notes || ""
  });
  
  const [damageParts, setDamageParts] = useState<DamagePart[]>(
    task?.damageParts?.parts || []
  );

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
  });

  const saveTaskMutation = useMutation({
    mutationFn: task ? 
      (taskData: any) => updateTask(task.id, taskData) :
      createTask,
    onSuccess: () => {
      toast.success(task ? "Taak succesvol bijgewerkt" : "Taak succesvol aangemaakt");
      onTaskAdded();
    },
    onError: (error) => {
      console.error("Error saving task:", error);
      toast.error(task ? "Fout bij het bijwerken van de taak" : "Fout bij het aanmaken van de taak");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Je moet ingelogd zijn om een taak aan te maken");
      return;
    }

    if (!formData.assignedTo) {
      toast.error("Selecteer een medewerker om de taak toe te wijzen");
      return;
    }
    
    const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
    
    const taskData: any = {
      title: formData.title,
      description: formData.description,
      assignedTo: formData.assignedTo,
      assignedBy: user.id,
      vehicleId: formData.vehicleId || undefined,
      vehicleBrand: selectedVehicle?.brand,
      vehicleModel: selectedVehicle?.model,
      vehicleLicenseNumber: selectedVehicle?.licenseNumber,
      vehicleVin: selectedVehicle?.vin,
      dueDate: formData.dueDate,
      status: "toegewezen" as const,
      priority: formData.priority,
      category: formData.category,
      location: formData.location,
      estimatedDuration: formData.estimatedDuration,
      notes: formData.notes
    };
    
    // Add damage parts if category is schadeherstel
    if (formData.category === "schadeherstel" && damageParts.length > 0) {
      taskData.damageParts = {
        parts: damageParts
      };
    }

    saveTaskMutation.mutate(taskData);
  };

  const priorityOptions = [
    { value: "laag", label: "Laag" },
    { value: "normaal", label: "Normaal" },
    { value: "hoog", label: "Hoog" },
    { value: "urgent", label: "Urgent" }
  ];

  const categoryOptions = [
    { value: "voorbereiding", label: "Voorbereiding" },
    { value: "transport", label: "Transport" },
    { value: "inspectie", label: "Inspectie" },
    { value: "schoonmaak", label: "Schoonmaak" },
    { value: "reparatie", label: "Reparatie" },
    { value: "schadeherstel", label: "Schadeherstel" },
    { value: "administratie", label: "Administratie" },
    { value: "aflevering", label: "Aflevering" },
    { value: "ophalen", label: "Ophalen" },
    { value: "overig", label: "Overig" }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Taak Bewerken" : "Nieuwe Taak Toevoegen"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Toegewezen aan *</Label>
              <Select value={formData.assignedTo} onValueChange={(value) => setFormData({...formData, assignedTo: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer medewerker" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} - {employee.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              required
            />
          </div>

          <SearchableVehicleSelector
            value={formData.vehicleId}
            onValueChange={(vehicle) => setFormData({...formData, vehicleId: vehicle?.id || ""})}
            vehicles={vehicles}
            label="Voertuig (optioneel)"
            placeholder="Zoek op merk, model, VIN, kenteken..."
            loading={false}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vervaldatum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Selecteer datum</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => date && setFormData({...formData, dueDate: date})}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioriteit</Label>
              <Select value={formData.priority} onValueChange={(value: TaskPriority) => setFormData({...formData, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categorie</Label>
              <Select value={formData.category} onValueChange={(value: TaskCategory) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Duur (min)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({...formData, estimatedDuration: parseInt(e.target.value)})}
                min="15"
                step="15"
              />
            </div>
          </div>

            <div className="space-y-2">
              <Label htmlFor="location">Locatie</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Bijv. Werkplaats, Showroom, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notities</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Extra opmerkingen of instructies..."
                rows={2}
              />
            </div>

          {formData.category === "schadeherstel" && (
            <div className="space-y-4 border-t pt-4">
              <VehicleDamageSelector
                selectedParts={damageParts}
                onPartsChange={setDamageParts}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={saveTaskMutation.isPending}>
              {saveTaskMutation.isPending ? "Opslaan..." : (task ? "Taak Bijwerken" : "Taak Aanmaken")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
