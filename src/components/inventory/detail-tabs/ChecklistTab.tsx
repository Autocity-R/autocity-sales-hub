import React, { useState } from "react";
import { ClipboardCheck, Circle, CheckCircle2, Trash2, Plus, UserPlus, ClipboardList, Download, QrCode } from "lucide-react";
import { exportChecklistToExcel } from "@/utils/checklistExportExcel";
import { Vehicle, ChecklistItem } from "@/types/inventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { TaskForm } from "@/components/tasks/TaskForm";
import { ChecklistQRDialog } from "@/components/inventory/ChecklistQRDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistTabProps {
  vehicle: Vehicle;
  onUpdate: (vehicle: Vehicle) => void;
  onAutoSave?: (vehicle: Vehicle) => void; // Direct opslaan naar database (bijv. voor taak koppeling)
  readOnly?: boolean;
  canToggleOnly?: boolean; // Alleen afvinken toegestaan (geen toevoegen/verwijderen)
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({ vehicle, onUpdate, onAutoSave, readOnly, canToggleOnly }) => {
  const [newItemDescription, setNewItemDescription] = useState("");
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [assignTaskItem, setAssignTaskItem] = useState<ChecklistItem | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const { user } = useAuth();

  const checklist = vehicle.details?.preDeliveryChecklist || [];
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Get all linkedTaskIds from checklist items
  const linkedTaskIds = checklist
    .filter(item => item.linkedTaskId)
    .map(item => item.linkedTaskId as string);

  // Validate which linked tasks still exist in the database
  const { data: existingTaskIds = [] } = useQuery({
    queryKey: ['existing-tasks', linkedTaskIds],
    queryFn: async () => {
      if (linkedTaskIds.length === 0) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id')
        .in('id', linkedTaskIds);
      return (data || []).map(t => t.id);
    },
    enabled: linkedTaskIds.length > 0,
    staleTime: 30000, // 30 seconds cache
  });

  // Helper function to check if a linked task actually exists
  const taskExists = (taskId: string | undefined): boolean => {
    if (!taskId) return false;
    return existingTaskIds.includes(taskId);
  };

  const handleAddItem = () => {
    if (!newItemDescription.trim() || !user) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      description: newItemDescription.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      createdByName: user.email?.split('@')[0] || 'Onbekend',
    };

    const updatedChecklist = [...checklist, newItem];
    
    onUpdate({
      ...vehicle,
      details: {
        ...vehicle.details,
        preDeliveryChecklist: updatedChecklist,
      },
    });

    setNewItemDescription("");
  };

  const handleToggleItem = (itemId: string) => {
    if (!user) return;

    const updatedChecklist = checklist.map(item => {
      if (item.id === itemId) {
        const nowCompleted = !item.completed;
        return {
          ...item,
          completed: nowCompleted,
          completedAt: nowCompleted ? new Date().toISOString() : undefined,
          completedBy: nowCompleted ? user.id : undefined,
          completedByName: nowCompleted ? user.email?.split('@')[0] || 'Onbekend' : undefined,
        };
      }
      return item;
    });

    onUpdate({
      ...vehicle,
      details: {
        ...vehicle.details,
        preDeliveryChecklist: updatedChecklist,
      },
    });
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedChecklist = checklist.filter(item => item.id !== itemId);
    
    onUpdate({
      ...vehicle,
      details: {
        ...vehicle.details,
        preDeliveryChecklist: updatedChecklist,
      },
    });

    setItemToDelete(null);
  };

  const handleTaskCreated = (checklistItemId: string, taskId: string) => {
    // Update the checklist item with the linked task ID
    const updatedChecklist = checklist.map(item => {
      if (item.id === checklistItemId) {
        return {
          ...item,
          linkedTaskId: taskId,
        };
      }
      return item;
    });

    const updatedVehicle = {
      ...vehicle,
      details: {
        ...vehicle.details,
        preDeliveryChecklist: updatedChecklist,
      },
    };

    // Update lokale state
    onUpdate(updatedVehicle);
    
    // Direct opslaan naar database zodat de koppeling blijft behouden
    if (onAutoSave) {
      console.log('Auto-saving checklist task link for item:', checklistItemId, 'task:', taskId);
      onAutoSave(updatedVehicle);
    }
    
    setAssignTaskItem(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: nl });
    } catch {
      return dateString;
    }
  };

  const isRecentlyAdded = (dateString: string) => {
    const itemDate = new Date(dateString);
    const now = new Date();
    const hoursDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // Generate prefilled data for task form
  const getPrefilledTaskData = (item: ChecklistItem) => ({
    title: `${vehicle.brand} ${vehicle.model} - ${vehicle.vin || vehicle.licenseNumber || 'Checklist'}`,
    description: item.description,
    vehicleId: vehicle.id,
    linkedChecklistItemId: item.id,
    linkedVehicleId: vehicle.id,
  });

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Voortgang Checklist
              </CardTitle>
              <CardDescription>
                {totalCount === 0 
                  ? "Nog geen taken toegevoegd" 
                  : `${completedCount} van ${totalCount} ${totalCount === 1 ? 'taak' : 'taken'} voltooid`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowQRDialog(true)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Sticker
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportChecklistToExcel(vehicle)}
                disabled={totalCount === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-sm text-muted-foreground text-center">
            {progressPercentage}% voltooid
          </p>
        </CardContent>
      </Card>

      {/* Add New Item - alleen tonen als niet readOnly EN niet canToggleOnly */}
      {!readOnly && !canToggleOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nieuwe taak toevoegen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Beschrijving van de taak..."
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem();
                  }
                }}
                className="flex-1"
              />
              <Button 
                onClick={handleAddItem} 
                disabled={!newItemDescription.trim()}
                size="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                Toevoegen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Items */}
      <div className="space-y-3">
        {totalCount === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Nog geen taken in de checklist. Voeg taken toe om bij te houden wat er aan het voertuig moet gebeuren.
              </p>
            </CardContent>
          </Card>
        ) : (
          checklist.map((item, index) => (
            <Card key={item.id} className={item.completed ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="pt-0.5">
                    {readOnly ? (
                      item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )
                    ) : (
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        className="mt-0.5"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <p className={`font-medium ${item.completed ? 'text-green-700 dark:text-green-400' : ''}`}>
                        {item.description}
                      </p>
                      {isRecentlyAdded(item.createdAt) && !item.completed && (
                        <Badge variant="secondary" className="text-xs">Nieuw</Badge>
                      )}
                      {item.linkedTaskId && taskExists(item.linkedTaskId) && (
                        <Badge variant="outline" className="text-xs">
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Taak toegewezen
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {item.completed && item.completedAt ? (
                        <p className="text-green-600 dark:text-green-500">
                          ✓ Voltooid door {item.completedByName} op {formatDate(item.completedAt)}
                        </p>
                      ) : (
                        <p>
                          Toegevoegd door {item.createdByName} op {formatDate(item.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {/* Assign Task Button - alleen tonen voor niet-voltooide items zonder bestaande gekoppelde taak */}
                    {!readOnly && !item.completed && !taskExists(item.linkedTaskId) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAssignTaskItem(item)}
                        className="text-muted-foreground hover:text-primary"
                        title="Taak toewijzen"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Delete Button - alleen tonen als niet readOnly EN niet canToggleOnly */}
                    {!readOnly && !canToggleOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setItemToDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Taak verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze taak wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && handleDeleteItem(itemToDelete)}>
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Form Dialog */}
      {assignTaskItem && (
        <TaskForm
          onClose={() => setAssignTaskItem(null)}
          onTaskAdded={() => {
            // We'll handle linking via a callback from TaskForm
            setAssignTaskItem(null);
          }}
          prefilledData={getPrefilledTaskData(assignTaskItem)}
          onTaskCreatedWithId={(taskId: string) => handleTaskCreated(assignTaskItem.id, taskId)}
        />
      )}

      {/* QR Sticker Dialog */}
      <ChecklistQRDialog
        vehicle={vehicle}
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
      />
    </div>
  );
};