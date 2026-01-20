
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Plus } from "lucide-react";
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
import { DamageSelectionDialog } from "./DamageSelectionDialog";
import { Badge } from "@/components/ui/badge";

interface PrefilledData {
  title: string;
  description: string;
  vehicleId: string;
  linkedChecklistItemId: string;
  linkedVehicleId: string;
}

interface TaskFormProps {
  task?: Task | null;
  onClose: () => void;
  onTaskAdded: () => void;
  prefilledData?: PrefilledData;
  onTaskCreatedWithId?: (taskId: string) => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ 
  task, 
  onClose, 
  onTaskAdded, 
  prefilledData,
  onTaskCreatedWithId 
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: prefilledData?.title || task?.title || "",
    description: prefilledData?.description || task?.description || "",
    assignedTo: task?.assignedTo || "",
    vehicleId: prefilledData?.vehicleId || task?.vehicleId || "",
    dueDate: task?.dueDate ? new Date(task.dueDate) : new Date(),
    priority: (task?.priority || "normaal") as TaskPriority,
    category: (task?.category || "klaarmaken") as TaskCategory,
    location: task?.location || "",
    estimatedDuration: task?.estimatedDuration || 60,
    notes: task?.notes || ""
  });
  
  const [damageParts, setDamageParts] = useState<DamagePart[]>(
    task?.damageParts?.parts || []
  );
  const [damageDialogOpen, setDamageDialogOpen] = useState(false);

  // Flag to check if this is a prefilled task from checklist
  const isFromChecklist = !!prefilledData?.linkedChecklistItemId;

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
    mutationFn: async (taskData: any) => {
      console.log('[TaskForm] mutationFn called with:', taskData);
      console.log('[TaskForm] Category being sent:', taskData.category);
      if (task) {
        console.log('[TaskForm] Updating existing task:', task.id);
        const result = await updateTask(task.id, taskData);
        console.log('[TaskForm] Update result:', result);
        return result;
      }
      console.log('[TaskForm] Creating new task');
      return createTask(taskData);
    },
    onSuccess: async (data) => {
      console.log('[TaskForm] Task saved successfully:', data);
      toast.success(task ? "Taak succesvol bijgewerkt" : "Taak succesvol aangemaakt");
      
      // Force invalidate and refetch all task queries before closing
      console.log('[TaskForm] Invalidating and refetching task queries...');
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.refetchQueries({ queryKey: ["tasks"], type: 'active' });
      console.log('[TaskForm] Queries refreshed, calling onTaskAdded');
      
      // If this task was created from a checklist, notify with the task ID
      if (onTaskCreatedWithId && data.id) {
        onTaskCreatedWithId(data.id);
      }
      
      onTaskAdded();
    },
    onError: (error) => {
      console.error("[TaskForm] Error saving task:", error);
      toast.error(task ? "Fout bij het bijwerken van de taak" : "Fout bij het aanmaken van de taak");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[TaskForm] handleSubmit called');
    console.log('[TaskForm] Current formData:', formData);
    console.log('[TaskForm] Current formData.category:', formData.category);
    
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
      status: task?.status || "toegewezen",
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

    // Add linked checklist fields if this is from a checklist
    if (prefilledData?.linkedChecklistItemId) {
      taskData.linkedChecklistItemId = prefilledData.linkedChecklistItemId;
      taskData.linkedVehicleId = prefilledData.linkedVehicleId;
    }

    console.log('[TaskForm] Final taskData to submit:', taskData);

    try {
      await saveTaskMutation.mutateAsync(taskData);
      console.log('[TaskForm] mutateAsync completed successfully');
    } catch (error) {
      console.error('[TaskForm] mutateAsync error:', error);
    }
  };

  const priorityOptions = [
    { value: "laag", label: "Laag" },
    { value: "normaal", label: "Normaal" },
    { value: "hoog", label: "Hoog" },
    { value: "urgent", label: "Urgent" }
  ];

  const categoryOptions = [
    { value: "klaarmaken", label: "Klaarmaken" },
    { value: "onderdelen", label: "Onderdelen" },
    { value: "onderdelen_bestellen", label: "Onderdelen Bestellen" },
    { value: "transport", label: "Transport" },
    { value: "schoonmaak", label: "Schoonmaak" },
    { value: "reparatie", label: "Reparatie" },
    { value: "schadeherstel", label: "Schadeherstel" },
    { value: "werkplaats", label: "Werkplaats" },
    { value: "aflevering", label: "Aflevering" },
    { value: "overig", label: "Overig" }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? "Taak Bewerken" : isFromChecklist ? "Taak Toewijzen vanuit Checklist" : "Nieuwe Taak Toevoegen"}
          </DialogTitle>
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

          {/* Vehicle selector - disabled when from checklist */}
          {isFromChecklist ? (
            <div className="space-y-2">
              <Label>Voertuig (automatisch geselecteerd)</Label>
              <div className="p-3 bg-muted rounded-md">
                {vehicles.find(v => v.id === formData.vehicleId) ? (
                  <p className="text-sm font-medium">
                    {vehicles.find(v => v.id === formData.vehicleId)?.brand}{" "}
                    {vehicles.find(v => v.id === formData.vehicleId)?.model} -{" "}
                    {vehicles.find(v => v.id === formData.vehicleId)?.licenseNumber || 
                     vehicles.find(v => v.id === formData.vehicleId)?.vin}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Voertuig wordt geladen...</p>
                )}
              </div>
            </div>
          ) : (
            <SearchableVehicleSelector
              value={formData.vehicleId}
              onValueChange={(vehicle) => setFormData({...formData, vehicleId: vehicle?.id || ""})}
              vehicles={vehicles}
              label="Voertuig (optioneel)"
              placeholder="Zoek op merk, model, VIN, kenteken..."
              loading={false}
            />
          )}

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
              <Select 
                value={formData.category} 
                onValueChange={(value: TaskCategory) => {
                  console.log('[TaskForm] Category changed from', formData.category, 'to', value);
                  setFormData({...formData, category: value});
                }}
              >
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
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Schadedelen</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDamageDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {damageParts.length === 0 ? 'Schade Toevoegen' : 'Bewerken'}
                </Button>
              </div>
              
              {damageParts.length > 0 ? (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {damageParts.length} beschadigd{damageParts.length > 1 ? 'e' : ''} {damageParts.length > 1 ? 'delen' : 'deel'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {damageParts.map(part => (
                      <Badge key={part.id} variant="destructive">
                        {part.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Geen schadedelen geselecteerd
                </p>
              )}
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

        <DamageSelectionDialog
          isOpen={damageDialogOpen}
          initialParts={damageParts}
          onSave={setDamageParts}
          onClose={() => setDamageDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};