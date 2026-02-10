import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, Clock, AlertCircle, RefreshCw, Wrench, Shield, Truck, Sparkles, ClipboardList, Package, Cog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task, TaskStatus, TaskCategory } from "@/types/tasks";
import { fetchTasks, updateTaskStatus, deleteTask, reorderTasks } from "@/services/taskService";
import { TaskForm } from "@/components/tasks/TaskForm";
import { DraggableTaskList } from "@/components/tasks/DraggableTaskList";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { TaskExportButton } from "@/components/tasks/TaskExportButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTasksRealtime } from "@/hooks/useTasksRealtime";

const TaskManagement = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  
  // Enable real-time updates
  useTasksRealtime();

  // Debug logging for iPad/Safari issues
  useEffect(() => {
    console.log('[TaskManagement] Render state - user:', user?.id ?? 'null', 'isAdmin:', isAdmin);
  }, [user, isAdmin]);

  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tasks", statusFilter, user?.id],
    queryFn: () => fetchTasks({ 
      status: statusFilter !== "all" ? statusFilter : undefined
    }),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatus(taskId, status),
    onSuccess: () => {
      toast({
        description: "Taakstatus bijgewerkt"
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: "Fout bij het bijwerken van de taakstatus"
      });
      console.error("Error updating task status:", error);
    }
  });

  const handleCompleteTask = (taskId: string) => {
    updateStatusMutation.mutate({ taskId, status: "voltooid" });
  };

  const handleStartTask = (taskId: string) => {
    updateStatusMutation.mutate({ taskId, status: "in_uitvoering" });
  };

  const handleTaskAdded = async () => {
    const wasEditing = !!editingTask;
    setShowTaskForm(false);
    setEditingTask(null);
    // Force invalidate and refetch all task queries
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    await queryClient.refetchQueries({ queryKey: ["tasks"] });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        description: "Taak succesvol verwijderd"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Fout bij het verwijderen van de taak"
      });
    }
  };

  const getStatusCounts = () => {
    const counts = {
      toegewezen: tasks.filter(t => t.status === "toegewezen").length,
      in_uitvoering: tasks.filter(t => t.status === "in_uitvoering").length,
      voltooid: tasks.filter(t => t.status === "voltooid").length,
      total: tasks.length
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  // Category counts for quick filter chips
  const categoryCounts = useMemo(() => {
    const counts: Record<TaskCategory, number> = {
      klaarmaken: 0, onderdelen: 0, onderdelen_bestellen: 0, werkplaats: 0, schadeherstel: 0, 
      transport: 0, schoonmaak: 0, reparatie: 0, aflevering: 0, overig: 0
    };
    tasks.forEach(t => {
      if (counts[t.category] !== undefined) {
        counts[t.category]++;
      }
    });
    return counts;
  }, [tasks]);

  // Main category chips to show
  const mainCategories: { key: TaskCategory; label: string; icon: React.ElementType; color: string }[] = [
    { key: "klaarmaken", label: "Klaarmaken", icon: ClipboardList, color: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300" },
    { key: "onderdelen_bestellen", label: "Onderdelen", icon: Package, color: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300" },
    { key: "werkplaats", label: "Werkplaats", icon: Wrench, color: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300" },
    { key: "schadeherstel", label: "Schadeherstel", icon: Shield, color: "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300" },
    { key: "transport", label: "Transport", icon: Truck, color: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300" },
    { key: "schoonmaak", label: "Schoonmaak", icon: Sparkles, color: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300" },
  ];

  const handleForceRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast({
      description: "Taken opnieuw geladen"
    });
  };

  const handleStatCardClick = (status: TaskStatus | "all") => {
    if (status === "all") {
      setStatusFilter("all");
    } else {
      setStatusFilter(status);
    }
  };

  // Handle reordering tasks after drag & drop
  const handleReorder = useCallback(async (reorderedTasks: Task[]) => {
    try {
      // Create the new sort order mappings
      const taskOrders = reorderedTasks.map((task, index) => ({
        id: task.id,
        sortOrder: index + 1
      }));

      // Optimistically update the cache
      queryClient.setQueryData(["tasks", statusFilter, user?.id], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return reorderedTasks;
        
        // Create a map of new positions
        const orderMap = new Map(taskOrders.map(t => [t.id, t.sortOrder]));
        
        // Update sort_order in old tasks and sort
        return [...oldTasks].sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? Infinity;
          const orderB = orderMap.get(b.id) ?? Infinity;
          return orderA - orderB;
        });
      });

      // Save to database
      await reorderTasks(taskOrders);
      
      toast({
        description: "Taakvolgorde opgeslagen"
      });
    } catch (error) {
      console.error("Failed to reorder tasks:", error);
      toast({
        variant: "destructive",
        description: "Fout bij het opslaan van de volgorde"
      });
      // Refetch to restore correct order
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  }, [queryClient, statusFilter, user?.id, toast]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">Je moet ingelogd zijn om taken te bekijken.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Pagina herladen
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-2 text-muted-foreground">Taken laden...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center space-y-4">
          <p className="text-destructive">Er is een fout opgetreden bij het laden van de taken.</p>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Probeer opnieuw
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Taken Beheer" 
          description={isAdmin ? "Beheer alle taken voor medewerkers en voertuigen" : "Bekijk en beheer je toegewezen taken"}
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleForceRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Ververs
            </Button>
            <TaskExportButton tasks={tasks} />
            <Button onClick={() => setShowTaskForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Taak
            </Button>
          </div>
        </PageHeader>

        {/* Category Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
            className="h-8"
          >
            Alle ({tasks.length})
          </Button>
          {mainCategories.map(({ key, label, icon: Icon, color }) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key)}
              className={`h-8 ${categoryFilter === key ? "ring-2 ring-primary " + color : ""}`}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {label} ({categoryCounts[key]})
            </Button>
          ))}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card 
            className={`cursor-pointer touch-manipulation transition-all hover:shadow-md ${statusFilter === "all" && categoryFilter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => { handleStatCardClick("all"); setCategoryFilter("all"); }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Actief</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{statusCounts.total}</div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Te doen</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer touch-manipulation transition-all hover:shadow-md ${statusFilter === "toegewezen" ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => handleStatCardClick("toegewezen")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Toegewezen</CardTitle>
              <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{statusCounts.toegewezen}</div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden md:block">Toegewezen</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer touch-manipulation transition-all hover:shadow-md ${statusFilter === "in_uitvoering" ? "ring-2 ring-orange-500" : ""}`}
            onClick={() => handleStatCardClick("in_uitvoering")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Lopend</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-orange-600">{statusCounts.in_uitvoering}</div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden md:block">In uitvoering</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer touch-manipulation transition-all hover:shadow-md ${statusFilter === "voltooid" ? "ring-2 ring-green-500" : ""}`}
            onClick={() => handleStatCardClick("voltooid")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Voltooid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-green-600">{statusCounts.voltooid}</div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden md:block">Afgerond</p>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <DraggableTaskList 
          tasks={tasks}
          onCompleteTask={handleCompleteTask}
          onStartTask={handleStartTask}
          onTaskSelect={setSelectedTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onReorder={handleReorder}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
        />

        {/* Task Form Dialog */}
        {showTaskForm && (
          <TaskForm
            task={editingTask}
            onClose={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
            onTaskAdded={handleTaskAdded}
          />
        )}

        {/* Task Detail Dialog */}
        <TaskDetail
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onCompleteTask={handleCompleteTask}
          onStartTask={handleStartTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
        />
      </div>
    </DashboardLayout>
  );
};

export default TaskManagement;
