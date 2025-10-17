
import React, { memo, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle, Clock, AlertCircle, Car, User, Play, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskStatus } from "@/types/tasks";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskMobileCard } from "./TaskMobileCard";

interface TaskListProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onTaskSelect: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  statusFilter: TaskStatus | "all";
  onStatusFilterChange: (status: TaskStatus | "all") => void;
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
  const { user, isAdmin } = useAuth();
  
  // Check if current user can manage this task
  const canManageTask = isAdmin || task.assignedTo === user?.id || task.assignedBy === user?.id;
  
  // Check if current user can edit/delete (only who assigned it or admin)
  const canEditDelete = isAdmin || task.assignedBy === user?.id;
  
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
          <div className="flex space-x-2">
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
  onStatusFilterChange 
}) => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  
  const filteredTasks = useMemo(() => {
    return statusFilter === "all" 
      ? tasks.filter(task => 
          task.status !== "voltooid" && 
          task.status !== "geannuleerd" && 
          task.status !== "uitgesteld"
        )
      : tasks.filter(task => task.status === statusFilter);
  }, [tasks, statusFilter]);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-base md:text-lg font-medium">
          {isAdmin ? "Alle Taken" : "Mijn Taken"}
        </h3>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-48 touch-manipulation">
            <SelectValue placeholder="Filter op status" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="all">Actieve taken</SelectItem>
            <SelectItem value="toegewezen">Toegewezen</SelectItem>
            <SelectItem value="in_uitvoering">In uitvoering</SelectItem>
            <SelectItem value="voltooid">Voltooid</SelectItem>
            <SelectItem value="uitgesteld">Uitgesteld</SelectItem>
            <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
          </SelectContent>
        </Select>
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
