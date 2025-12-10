import React, { memo, useMemo, useCallback, useState } from "react";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckCircle, Clock, AlertCircle, Car, User, Play, Edit, Trash2, Wrench, Truck, Sparkles, Shield, Package, ClipboardList, Tag, Cog } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, TaskStatus, TaskCategory } from "@/types/tasks";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TaskMobileCard } from "./TaskMobileCard";

// Priority color configuration
const priorityConfig = {
  urgent: { 
    border: "border-l-4 border-l-red-500", 
    bg: "bg-red-50 dark:bg-red-950/20",
    badge: "bg-red-500 text-white hover:bg-red-600"
  },
  hoog: { 
    border: "border-l-4 border-l-orange-500", 
    bg: "bg-orange-50 dark:bg-orange-950/20",
    badge: "bg-orange-500 text-white hover:bg-orange-600"
  },
  normaal: { 
    border: "border-l-4 border-l-green-500", 
    bg: "",
    badge: "bg-green-500 text-white hover:bg-green-600"
  },
  laag: { 
    border: "border-l-4 border-l-gray-300", 
    bg: "",
    badge: "bg-gray-400 text-white hover:bg-gray-500"
  },
};

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

interface DraggableTaskListProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onTaskSelect: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onReorder: (tasks: Task[]) => void;
  statusFilter: TaskStatus | "all";
  onStatusFilterChange: (status: TaskStatus | "all") => void;
  categoryFilter: TaskCategory | "all";
  onCategoryFilterChange: (category: TaskCategory | "all") => void;
}

// Sortable task card component
const SortableTaskCard = memo<{
  task: Task;
  onCompleteTask: (taskId: string) => void;
  onStartTask: (taskId: string) => void;
  onTaskSelect: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  isDraggable: boolean;
  position: number;
}>(({ task, onCompleteTask, onStartTask, onTaskSelect, onEditTask, onDeleteTask, isDraggable, position }) => {
  const { user, isAdmin } = useAuth();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isDraggable });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const canManageTask = isAdmin || task.assignedTo === user?.id || task.assignedBy === user?.id;
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
      case "toegewezen": return "default" as const;
      case "in_uitvoering": return "secondary" as const;
      case "voltooid": return "outline" as const;
      default: return "outline" as const;
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
  const prioConfig = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.normaal;

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={`hover:shadow-md transition-shadow cursor-pointer ${prioConfig.border} ${prioConfig.bg} ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`} 
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {/* Position number and drag handle */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center">
                  {position}
                </span>
                {isDraggable && (
                  <button
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(task.status)}
                  <h4 className="font-medium truncate">{task.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-end flex-shrink-0">
              <Badge variant="outline" className={`${catConfig.bgColor} ${catConfig.color} border`}>
                <CategoryIcon className="h-3 w-3 mr-1" />
                {catConfig.label}
              </Badge>
              <Badge className={prioConfig.badge}>
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
            <div className="flex space-x-2">
              {canEditDelete && (
                <>
                  <Button size="sm" variant="outline" onClick={handleEditClick}>
                    <Edit className="h-4 w-4 mr-1" />
                    Bewerken
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDeleteClick}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Verwijderen
                  </Button>
                </>
              )}
            </div>

            {canManageTask && task.status !== "voltooid" && (
              <div className="flex space-x-2">
                {task.status === "toegewezen" && (
                  <Button size="sm" variant="outline" onClick={handleStartClick}>
                    <Play className="h-4 w-4 mr-2" />
                    Start taak
                  </Button>
                )}
                
                {(task.status === "in_uitvoering" || task.status === "toegewezen") && (
                  <Button size="sm" onClick={handleCompleteClick}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Markeer als voltooid
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

SortableTaskCard.displayName = "SortableTaskCard";

export const DraggableTaskList = memo<DraggableTaskListProps>(({ 
  tasks, 
  onCompleteTask, 
  onStartTask, 
  onTaskSelect,
  onEditTask,
  onDeleteTask,
  onReorder,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange
}) => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex(t => t.id === active.id);
      const newIndex = filteredTasks.findIndex(t => t.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newTasks = arrayMove(filteredTasks, oldIndex, newIndex);
        onReorder(newTasks);
      }
    }
  }, [filteredTasks, onReorder]);

  const activeTask = useMemo(() => 
    activeId ? filteredTasks.find(t => t.id === activeId) : null,
    [activeId, filteredTasks]
  );

  // Only admins/managers can drag
  const canDrag = isAdmin;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-medium">
            {isAdmin ? "Werklijst (sleep om te herschikken)" : "Mijn Werklijst"}
          </h3>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground">Pak altijd de bovenste taak</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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

      {/* Priority legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted-foreground">Prioriteit:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded"></span> Urgent
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-orange-500 rounded"></span> Hoog
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded"></span> Normaal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-gray-400 rounded"></span> Laag
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 md:p-8 text-center text-muted-foreground text-sm">
            Geen taken gevonden voor de geselecteerde filter.
          </CardContent>
        </Card>
      ) : isMobile ? (
        // Mobile: no drag, just list
        <div className="grid gap-3 md:gap-4">
          {filteredTasks.map((task, index) => (
            <TaskMobileCard
              key={task.id}
              task={task}
              onCompleteTask={onCompleteTask}
              onStartTask={onStartTask}
              onTaskSelect={onTaskSelect}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      ) : (
        // Desktop: with drag & drop for admins
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredTasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3 md:gap-4">
              {filteredTasks.map((task, index) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onCompleteTask={onCompleteTask}
                  onStartTask={onStartTask}
                  onTaskSelect={onTaskSelect}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  isDraggable={canDrag}
                  position={index + 1}
                />
              ))}
            </div>
          </SortableContext>
          
          <DragOverlay>
            {activeTask ? (
              <Card className="shadow-xl ring-2 ring-primary opacity-90">
                <CardHeader className="pb-2">
                  <h4 className="font-medium">{activeTask.title}</h4>
                </CardHeader>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
});

DraggableTaskList.displayName = "DraggableTaskList";