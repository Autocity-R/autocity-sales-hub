import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

export const TaskPerformanceOverview = () => {
  const { data: taskStats, isLoading } = useQuery({
    queryKey: ["task-performance-overview"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Alle taken deze maand
      const { data: allTasks } = await supabase
        .from("tasks")
        .select("*")
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());

      // Voltooide taken
      const completedTasks = allTasks?.filter(t => t.status === "voltooid") || [];
      
      // Te late taken (voltooid na due_date)
      const lateTasks = completedTasks.filter(t => 
        t.completed_at && t.due_date && new Date(t.completed_at) > new Date(t.due_date)
      );
      
      // Op tijd voltooide taken
      const onTimeTasks = completedTasks.filter(t => 
        t.completed_at && t.due_date && new Date(t.completed_at) <= new Date(t.due_date)
      );

      // Openstaande taken die te laat zijn
      const overdueTasks = allTasks?.filter(t => 
        t.status !== "voltooid" && 
        t.status !== "geannuleerd" &&
        t.due_date && 
        new Date(t.due_date) < now
      ) || [];

      // Gemiddelde afhandeltijd (in uren)
      const avgCompletionTime = completedTasks.length > 0
        ? completedTasks.reduce((sum, task) => {
            if (task.completed_at && task.created_at) {
              const hours = (new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);
              return sum + hours;
            }
            return sum;
          }, 0) / completedTasks.length
        : 0;

      // Taken per categorie
      const categoryData = allTasks?.reduce((acc, task) => {
        const category = task.category || "overig";
        if (!acc[category]) {
          acc[category] = { category, total: 0, completed: 0 };
        }
        acc[category].total++;
        if (task.status === "voltooid") {
          acc[category].completed++;
        }
        return acc;
      }, {} as Record<string, { category: string; total: number; completed: number }>) || {};

      return {
        totalTasks: allTasks?.length || 0,
        completedTasks: completedTasks.length,
        lateTasks: lateTasks.length,
        onTimeTasks: onTimeTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate: allTasks && allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0,
        onTimeRate: completedTasks.length > 0 ? (onTimeTasks.length / completedTasks.length) * 100 : 0,
        avgCompletionTime,
        categoryChart: Object.values(categoryData)
      };
    },
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Taken</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Deze maand
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voltooid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {taskStats?.completedTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {taskStats?.completionRate?.toFixed(1) || 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Op Tijd</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {taskStats?.onTimeTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {taskStats?.onTimeRate?.toFixed(1) || 0}% op tijd rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Te Laat</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {taskStats?.overdueTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Openstaand & te laat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Gem. Afhandeltijd</span>
              <span className="font-bold">{taskStats?.avgCompletionTime?.toFixed(1) || 0} uur</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Te Laat Afgerond</span>
              <span className="font-bold text-red-600">{taskStats?.lateTasks || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Op Tijd Afgerond</span>
              <span className="font-bold text-green-600">{taskStats?.onTimeTasks || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Taken per Categorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskStats?.categoryChart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Voltooid" />
                <Bar dataKey="total" fill="hsl(var(--muted))" name="Totaal" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
