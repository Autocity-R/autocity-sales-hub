
import React, { memo, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle, Clock, AlertCircle, Car, User, Play } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskStatus } from "@/types/tasks";

interface TaskListProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onTaskSelect: (task: Task) => void;
  statusFilter: TaskStatus | "all";
  onStatusFilterChange: (status: TaskStatus | "all") => void;
}

// Memoized task card component
const TaskCard = memo<{
  task: Task;
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onTaskSelect: (task: Task) => void;
}>(({ task, onCompleteTask, onStartTask, onTaskSelect }) => {
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
            <span>Toegewezen aan: {task.assignedTo}</span>
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

        {task.status !== "voltooid" && (
          <div className="mt-4 flex justify-end space-x-2">
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
      </CardContent>
    </Card>
  );
});

export const TaskList = memo<TaskListProps>(({
  tasks,
  onCompleteTask,
  onStartTask,
  onTaskSelect,
  statusFilter,
  onStatusFilterChange
}) => {
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Taken Overzicht</h3>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter op status" />
          </SelectTrigger>
          <SelectContent>
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
          <CardContent className="p-8 text-center text-muted-foreground">
            Geen taken gevonden voor de geselecteerde filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onCompleteTask={onCompleteTask}
              onStartTask={onStartTask}
              onTaskSelect={onTaskSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TaskList.displayName = "TaskList";
TaskCard.displayName = "TaskCard";
