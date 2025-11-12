import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task, TaskStatus } from "@/types/tasks";
import { fetchTasks, updateTaskStatus, deleteTask } from "@/services/taskService";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { useAuth } from "@/contexts/AuthContext";
import { useTasksRealtime } from "@/hooks/useTasksRealtime";

const TaskManagement = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  
  // Enable real-time updates
  useTasksRealtime();

  const {
    data: tasks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tasks", statusFilter, user?.id],
    queryFn: () => fetchTasks({ 
      status: statusFilter !== "all" ? statusFilter : undefined
    }),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always'
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

  const handleTaskAdded = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast({
      description: editingTask ? "Taak succesvol bijgewerkt" : "Taak succesvol toegevoegd"
    });
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

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Je moet ingelogd zijn om taken te bekijken.</p>
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
        <div className="p-8 text-center text-destructive">
          Er is een fout opgetreden bij het laden van de taken.
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
            <Button onClick={() => setShowTaskForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Taak
            </Button>
          </div>
        </PageHeader>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card 
            className={`cursor-pointer touch-manipulation transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => handleStatCardClick("all")}
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
        <TaskList 
          tasks={tasks}
          onCompleteTask={handleCompleteTask}
          onStartTask={handleStartTask}
          onTaskSelect={setSelectedTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
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
