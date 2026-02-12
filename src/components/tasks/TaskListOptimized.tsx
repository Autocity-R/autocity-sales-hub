
import React, { memo, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle, Clock, AlertCircle, Car, User, Play, Edit, Trash2, Wrench, Truck, Sparkles, Shield, Package, ClipboardList, Tag, Cog } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskStatus, TaskCategory } from "@/types/tasks";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskMobileCard } from "./TaskMobileCard";

// Category configuration with colors and icons
const categoryConfig: Record<TaskCategory, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  klaarmaken: { label: "Klaarmaken", color: "text-cyan-700 dark:text-cyan-300", bgColor: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800", icon: ClipboardList },
  onderdelen: { label: "Onderdelen", color: "text-slate-700 dark:text-slate-300", bgColor: "bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800", icon: Cog },
  onderdelen_bestellen: { label: "Onderdelen Bestellen", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800", icon: Package },
  werkplaats: { label: "Werkplaats", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800", icon: Wrench },
  schadeherstel: { label: "Schadeherstel", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800", icon: Shield },
  transport: { label: "Transport", color: "text-green-700 dark:text-green-300", bgColor: "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800", icon: Truck },
  schoonmaak: { label: "Schoonmaak", color: "text-purple-700 dark:text-purple-300", bgColor: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800", icon: Sparkles },
  reparatie: { label: "Reparatie", color: "text-red-700 dark:text-red-300", bgColor: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800", icon: Wrench },
  aflevering: { label: "Aflevering", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800", icon: Package },
  overig: { label: "Overig", color: "text-slate-700 dark:text-slate-300", bgColor: "bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800", icon: Tag },
};

interface TaskListProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onTaskSelect: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  statusFilter: TaskStatus | "all";
  onStatusFilterChange: (status: TaskStatus | "all") => void;
  categoryFilter: TaskCategory | "all";
  onCategoryFilterChange: (category: TaskCategory | "all") => void;
}

// Memoized task card component
const TaskCard = memo<{
  task: Task;
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onTaskSelect: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}>(({ task, onCompleteTask, onStartTask, onTaskSelect, onEditTask, onDeleteTask }) => {
  const { user, isAdmin, userRole } = useAuth();
  
  // Check if current user can manage this task (aftersales_manager can manage all tasks)
  const isManagerRole = isAdmin || userRole === 'manager' || userRole === 'aftersales_manager' || userRole === 'verkoper';
  const canManageTask = isManagerRole || task.assignedTo === user?.id || task.assignedBy === user?.id;
  
  // Check if current user can edit/delete
  const canEditDelete = isAdmin || userRole === 'aftersales_manager' || task.assignedBy === user?.id;
  
  const getStatusIcon = useCallback((status: TaskStatus) => {
    switch (status) {
      case "toegewezen":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "in_uitvoering":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "voltooid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  const getStatusVariant = useCallback((status: TaskStatus) => {
    switch (status) {
      case "toegewezen":
        return "default" as const;
      case "in_uitvoering":
        return "secondary" as const;
      case "voltooid":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  }, []);

  const getPriorityVariant = useCallback((priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive" as const;
      case "hoog":
        return "secondary" as const;
      case "normaal":
        return "outline" as const;
      case "laag":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  }, []);

  const handleCompleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCompleteTask(task.id);
  }, [task.id, onCompleteTask]);

  const handleStartClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onStartTask(task.id);
  }, [task.id, onStartTask]);

  const handleCardClick = useCallback(() => {
    onTaskSelect(task);
  }, [task, onTaskSelect]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEditTask(task);
  }, [task, onEditTask]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Weet je zeker dat je deze taak wilt verwijderen?')) {
      onDeleteTask(task.id);
    }
  }, [task.id, onDeleteTask]);

  const formattedDate = useMemo(() => {
    return format(new Date(task.dueDate), "dd/MM/yyyy HH:mm");
  }, [task.dueDate]);

  const catConfig = categoryConfig[task.category] || categoryConfig.overig;
  const CategoryIcon = catConfig.icon;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {getStatusIcon(task.status)}
              <h4 className="font-medium">{task.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {/* Category Badge */}
            <Badge variant="outline" className={`${catConfig.bgColor} ${catConfig.color} border`}>
              <CategoryIcon className="h-3 w-3 mr-1" />
              {catConfig.label}
            </Badge>
            <Badge variant={getPriorityVariant(task.priority)}>
              {task.priority}
            </Badge>
            <Badge variant={getStatusVariant(task.status)}>
              {task.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Toegewezen aan: {
              (task as any).assigned_to_profile 
                ? `${(task as any).assigned_to_profile.first_name || ''} ${(task as any).assigned_to_profile.last_name || ''}`.trim() || (task as any).assigned_to_profile.email
                : 'Onbekende gebruiker'
            }</span>
          </div>
          
          {task.vehicleBrand && (
            <div className="flex items-center space-x-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span>{task.vehicleBrand} {task.vehicleModel}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Deadline: {formattedDate}</span>
          </div>
        </div>

        {task.category === "schadeherstel" && task.damageParts && task.damageParts.parts.length > 0 && (
          <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-900">
            <p className="text-sm font-medium mb-2 text-orange-900 dark:text-orange-100">
              Beschadigde delen ({task.damageParts.parts.length}):
            </p>
            <ul className="text-sm space-y-1">
              {task.damageParts.parts.map((part, idx) => (
                <li key={idx} className="text-orange-800 dark:text-orange-200">
                  <span className="font-medium">{part.name}:</span> {part.instruction}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-between">
          {/* Edit/Delete buttons - only for task creator or admin */}
          <div className="flex space-x-2">
            {canEditDelete && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleEditClick}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Bewerken
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Verwijderen
                </Button>
              </>
            )}
          </div>

          {/* Action buttons - for assigned users or admin */}
          {canManageTask && task.status !== "voltooid" && (
            <div className="flex space-x-2">
              {task.status === "toegewezen" && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleStartClick}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start taak
                </Button>
              )}
              
              {(task.status === "in_uitvoering" || task.status === "toegewezen") && (
                <Button 
                  size="sm" 
                  onClick={handleCompleteClick}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Markeer als voltooid
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export const TaskList = memo<TaskListProps>(({ 
  tasks, 
  onCompleteTask, 
  onStartTask, 
  onTaskSelect,
  onEditTask,
  onDeleteTask,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange
}) => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== "all") {
      result = result.filter(task => task.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter(task => task.category === categoryFilter);
    }
    return result;
  }, [tasks, statusFilter, categoryFilter]);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-base md:text-lg font-medium">
          {isAdmin ? "Alle Taken" : "Mijn Taken"}
        </h3>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger className="w-full sm:w-48 touch-manipulation">
              <SelectValue placeholder="Filter op categorie" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Alle categorieën</SelectItem>
              <SelectItem value="klaarmaken">📋 Klaarmaken</SelectItem>
              <SelectItem value="onderdelen_bestellen">📦 Onderdelen Bestellen</SelectItem>
              <SelectItem value="werkplaats">🔧 Werkplaats</SelectItem>
              <SelectItem value="schadeherstel">🛡️ Schadeherstel</SelectItem>
              <SelectItem value="transport">🚚 Transport</SelectItem>
              <SelectItem value="schoonmaak">✨ Schoonmaak</SelectItem>
              <SelectItem value="reparatie">🔨 Reparatie</SelectItem>
              <SelectItem value="aflevering">📦 Aflevering</SelectItem>
              <SelectItem value="overig">🏷️ Overig</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-48 touch-manipulation">
              <SelectValue placeholder="Filter op status" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="toegewezen">Toegewezen</SelectItem>
              <SelectItem value="in_uitvoering">In uitvoering</SelectItem>
              <SelectItem value="voltooid">Voltooid</SelectItem>
              <SelectItem value="uitgesteld">Uitgesteld</SelectItem>
              <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 md:p-8 text-center text-muted-foreground text-sm">
            Geen taken gevonden voor de geselecteerde filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {filteredTasks.map((task) => (
            isMobile ? (
              <TaskMobileCard
                key={task.id}
                task={task}
                onCompleteTask={onCompleteTask}
                onStartTask={onStartTask}
                onTaskSelect={onTaskSelect}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            ) : (
              <TaskCard
                key={task.id}
                task={task}
                onCompleteTask={onCompleteTask}
                onStartTask={onStartTask}
                onTaskSelect={onTaskSelect}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
});

TaskList.displayName = "TaskList";
TaskCard.displayName = "TaskCard";
