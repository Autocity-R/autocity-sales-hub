import React, { memo, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle, Clock, AlertCircle, Car, User, MoreVertical, Play, Edit, Trash2, Wrench, Truck, Sparkles, Shield, Package, ClipboardList, Tag, Cog } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Task, TaskStatus, TaskCategory } from "@/types/tasks";

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
import { useAuth } from "@/contexts/AuthContext";

interface TaskMobileCardProps {
  task: Task;
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onTaskSelect: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskMobileCard = memo<TaskMobileCardProps>(({ 
  task, 
  onCompleteTask, 
  onStartTask, 
  onTaskSelect, 
  onEditTask, 
  onDeleteTask 
}) => {
  const { user, isAdmin } = useAuth();
  
  const canManageTask = isAdmin || task.assignedTo === user?.id || task.assignedBy === user?.id;
  const canEditDelete = isAdmin || task.assignedBy === user?.id;
  
  const getStatusIcon = useCallback((status: TaskStatus) => {
    switch (status) {
      case "toegewezen":
        return <Clock className="h-3.5 w-3.5 text-blue-500" />;
      case "in_uitvoering":
        return <AlertCircle className="h-3.5 w-3.5 text-orange-500" />;
      case "voltooid":
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-gray-500" />;
    }
  }, []);

  const getStatusColor = useCallback((status: TaskStatus) => {
    switch (status) {
      case "toegewezen":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "in_uitvoering":
        return "bg-orange-500/10 text-orange-700 border-orange-200";
      case "voltooid":
        return "bg-green-500/10 text-green-700 border-green-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white";
      case "hoog":
        return "bg-orange-500 text-white";
      case "normaal":
        return "bg-blue-500 text-white";
      case "laag":
        return "bg-gray-400 text-white";
      default:
        return "bg-gray-400 text-white";
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
    return format(new Date(task.dueDate), "dd/MM HH:mm");
  }, [task.dueDate]);

  const assignedToName = useMemo(() => {
    if ((task as any).assigned_to_profile) {
      const profile = (task as any).assigned_to_profile;
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email;
    }
    return 'Onbekend';
  }, [task]);

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer touch-manipulation"
      onClick={handleCardClick}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {getStatusIcon(task.status)}
              <h4 className="font-medium text-sm truncate">{task.title}</h4>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          </div>
          
          {/* Priority Badge - Compact Dot */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`} 
                 title={task.priority} />
            
            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 touch-manipulation"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canManageTask && task.status !== "voltooid" && (
                  <>
                    {task.status === "toegewezen" && (
                      <DropdownMenuItem onClick={handleStartClick}>
                        <Play className="h-4 w-4 mr-2" />
                        Start taak
                      </DropdownMenuItem>
                    )}
                    {(task.status === "in_uitvoering" || task.status === "toegewezen") && (
                      <DropdownMenuItem onClick={handleCompleteClick}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Markeer als voltooid
                      </DropdownMenuItem>
                    )}
                    {canEditDelete && <DropdownMenuSeparator />}
                  </>
                )}
                {canEditDelete && (
                  <>
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Edit className="h-4 w-4 mr-2" />
                      Bewerken
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijderen
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-2">
        {/* Status and Category Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Category Badge */}
          {(() => {
            const catConfig = categoryConfig[task.category] || categoryConfig.overig;
            const CategoryIcon = catConfig.icon;
            return (
              <Badge variant="outline" className={`text-xs px-2 py-0.5 ${catConfig.bgColor} ${catConfig.color} border`}>
                <CategoryIcon className="h-3 w-3 mr-1" />
                {catConfig.label}
              </Badge>
            );
          })()}
          <Badge 
            variant="outline" 
            className={`text-xs px-2 py-0.5 ${getStatusColor(task.status)}`}
          >
            {task.status.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            {task.priority}
          </Badge>
        </div>

        {/* Info Grid - Compact */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{assignedToName}</span>
          </div>
          
          {task.vehicleBrand && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Car className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">
                {task.vehicleBrand} {task.vehicleModel}
                {task.vehicleVin && ` • ${task.vehicleVin}`}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium text-foreground">{formattedDate}</span>
          </div>
        </div>

        {task.category === "schadeherstel" && task.damageParts && task.damageParts.parts.length > 0 && (
          <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-900">
            <p className="text-xs font-medium mb-1 text-orange-900 dark:text-orange-100">
              Beschadigde delen ({task.damageParts.parts.length}):
            </p>
            <ul className="text-xs space-y-0.5">
              {task.damageParts.parts.map((part, idx) => (
                <li key={idx} className="text-orange-800 dark:text-orange-200">
                  <span className="font-medium">{part.name}:</span> {part.instruction}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TaskMobileCard.displayName = "TaskMobileCard";
