
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task, TaskStatus } from "@/types/tasks";
import { fetchTasks, updateTaskStatus } from "@/services/taskService";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";

const TaskManagement = () => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: tasks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tasks", statusFilter],
    queryFn: () => fetchTasks(statusFilter !== "all" ? { status: statusFilter } : {}),
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

  const handleTaskAdded = () => {
    setShowTaskForm(false);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast({
      description: "Taak succesvol toegevoegd"
    });
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
          description="Beheer taken voor medewerkers en voertuigen"
        >
          <Button onClick={() => setShowTaskForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Taak
          </Button>
        </PageHeader>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Taken</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toegewezen</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statusCounts.toegewezen}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Uitvoering</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{statusCounts.in_uitvoering}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voltooid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statusCounts.voltooid}</div>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <TaskList 
          tasks={tasks}
          onCompleteTask={handleCompleteTask}
          onTaskSelect={setSelectedTask}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Task Form Dialog */}
        {showTaskForm && (
          <TaskForm
            onClose={() => setShowTaskForm(false)}
            onTaskAdded={handleTaskAdded}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default TaskManagement;
