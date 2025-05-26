
import React from "react";
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

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onCompleteTask,
  onStartTask,
  onTaskSelect,
  statusFilter,
  onStatusFilterChange
}) => {
  const getStatusIcon = (status: TaskStatus) => {
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
  };

  const getStatusVariant = (status: TaskStatus) => {
    switch (status) {
      case "toegewezen":
        return "default";
      case "in_uitvoering":
        return "secondary";
      case "voltooid":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "hoog":
        return "secondary";
      case "normaal":
        return "outline";
      case "laag":
        return "outline";
      default:
        return "outline";
    }
  };

  const filteredTasks = statusFilter === "all" 
    ? tasks.filter(task => 
        task.status !== "voltooid" && 
        task.status !== "geannuleerd" && 
        task.status !== "uitgesteld"
      )
    : tasks.filter(task => task.status === statusFilter);

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
            <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onTaskSelect(task)}>
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
                    <span>Deadline: {format(new Date(task.dueDate), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                </div>

                {task.status !== "voltooid" && (
                  <div className="mt-4 flex justify-end space-x-2">
                    {task.status === "toegewezen" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartTask(task.id);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start taak
                      </Button>
                    )}
                    
                    {(task.status === "in_uitvoering" || task.status === "toegewezen") && (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompleteTask(task.id);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Markeer als voltooid
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
