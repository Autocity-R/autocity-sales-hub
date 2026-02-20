import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  User, 
  Car, 
  MapPin, 
  Clock, 
  AlertCircle,
  FileText,
  CheckCircle,
  Play,
  Edit,
  Trash2
} from "lucide-react";
import { Task, TaskStatus } from "@/types/tasks";
import { useAuth } from "@/contexts/AuthContext";

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  open,
  onOpenChange,
  onCompleteTask,
  onStartTask,
  onEditTask,
  onDeleteTask,
}) => {
  const { user, isAdmin, userRole } = useAuth();

  if (!task) return null;

  const isManagerRole = isAdmin || userRole === 'manager' || userRole === 'aftersales_manager' || userRole === 'verkoper';
  const canManageTask = isManagerRole || task.assignedTo === user?.id || task.assignedBy === user?.id;
  const canEditDelete = isAdmin || userRole === 'aftersales_manager' || task.assignedBy === user?.id;

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "toegewezen":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "in_uitvoering":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case "voltooid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "uitgesteld":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "geannuleerd":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "hoog":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case "normaal":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "laag":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      voorbereiding: "Voorbereiding",
      transport: "Transport",
      inspectie: "Inspectie",
      schoonmaak: "Schoonmaak",
      reparatie: "Reparatie",
      schadeherstel: "Schadeherstel",
      administratie: "Administratie",
      aflevering: "Aflevering",
      ophalen: "Ophalen",
      overig: "Overig"
    };
    return categories[category] || category;
  };

  const handleEdit = () => {
    onEditTask(task);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (window.confirm('Weet je zeker dat je deze taak wilt verwijderen?')) {
      onDeleteTask(task.id);
      onOpenChange(false);
    }
  };

  const handleComplete = () => {
    onCompleteTask(task.id);
  };

  const handleStart = () => {
    onStartTask(task.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status en Prioriteit */}
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge className={getPriorityColor(task.priority)}>
              Prioriteit: {task.priority}
            </Badge>
            <Badge variant="outline">
              {getCategoryLabel(task.category)}
            </Badge>
          </div>

          {/* Omschrijving */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Omschrijving</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-6">{task.description}</p>
          </div>

          <Separator />

          {/* Taak details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deadline */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Deadline</span>
              </div>
              <p className="text-sm pl-6">
                {format(new Date(task.dueDate), "dd MMMM yyyy 'om' HH:mm", { locale: nl })}
              </p>
            </div>

            {/* Toegewezen aan */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Toegewezen aan</span>
              </div>
              <p className="text-sm pl-6">
                {(task as any).assigned_to_profile 
                  ? `${(task as any).assigned_to_profile.first_name || ''} ${(task as any).assigned_to_profile.last_name || ''}`.trim() || (task as any).assigned_to_profile.email
                  : 'Onbekende gebruiker'}
              </p>
            </div>

            {/* Toegewezen door */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Toegewezen door</span>
              </div>
              <p className="text-sm pl-6">
                {(task as any).assigned_by_profile 
                  ? `${(task as any).assigned_by_profile.first_name || ''} ${(task as any).assigned_by_profile.last_name || ''}`.trim() || (task as any).assigned_by_profile.email
                  : 'Onbekende gebruiker'}
              </p>
            </div>

            {/* Geschatte duur */}
            {task.estimatedDuration && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Geschatte duur</span>
                </div>
                <p className="text-sm pl-6">{task.estimatedDuration} minuten</p>
              </div>
            )}

            {/* Locatie */}
            {task.location && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Locatie</span>
                </div>
                <p className="text-sm pl-6">{task.location}</p>
              </div>
            )}

            {/* Voltooiingsdatum */}
            {task.status === "voltooid" && task.completedAt && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Voltooid op</span>
                </div>
                <p className="text-sm pl-6 text-green-700 dark:text-green-400">
                  {format(new Date(task.completedAt), "dd MMMM yyyy 'om' HH:mm", { locale: nl })}
                </p>
              </div>
            )}
          </div>

          {/* Voertuig informatie */}
          {(task.vehicleBrand || task.vehicleModel || task.vehicleLicenseNumber || task.vehicleVin) && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Voertuig</h3>
                </div>
                <div className="pl-6 space-y-2 text-sm">
                  {task.vehicleBrand && task.vehicleModel && (
                    <p>
                      <span className="font-medium">Merk & Model:</span>{" "}
                      {task.vehicleBrand} {task.vehicleModel}
                    </p>
                  )}
                  {task.vehicleLicenseNumber && (
                    <p>
                      <span className="font-medium">Kenteken:</span> {task.vehicleLicenseNumber}
                    </p>
                  )}
                  {task.vehicleVin && (
                    <p>
                      <span className="font-medium">VIN:</span> {task.vehicleVin}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Schade details */}
          {task.category === "schadeherstel" && task.damageParts && task.damageParts.parts.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <h3 className="font-medium">Beschadigde delen ({task.damageParts.parts.length})</h3>
                </div>
                <div className="pl-6 space-y-3">
                  {task.damageParts.parts.map((part, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-900">
                      <p className="font-medium text-sm text-orange-900 dark:text-orange-100">
                        {part.name}
                      </p>
                      <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                        {part.instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notities */}
          {task.notes && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Notities</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">{task.notes}</p>
              </div>
            </>
          )}

          {/* Acties */}
          <Separator />
          <div className="flex flex-wrap gap-2">
            {/* Bewerken/Verwijderen - alleen voor taak maker of admin */}
            {canEditDelete && (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Bewerken
                </Button>
                <Button variant="outline" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Verwijderen
                </Button>
              </>
            )}

            {/* Taak acties - voor toegewezen gebruiker of admin */}
            {canManageTask && task.status !== "voltooid" && (
              <>
                {task.status === "toegewezen" && (
                  <Button variant="outline" onClick={handleStart}>
                    <Play className="h-4 w-4 mr-2" />
                    Start taak
                  </Button>
                )}
                
                {(task.status === "in_uitvoering" || task.status === "toegewezen") && (
                  <Button onClick={handleComplete}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Markeer als voltooid
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
