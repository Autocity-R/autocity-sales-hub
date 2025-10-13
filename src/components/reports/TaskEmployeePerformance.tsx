import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Search,
  ArrowUpDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, endOfMonth, differenceInHours } from "date-fns";

interface EmployeeTaskData {
  userId: string;
  userName: string;
  userEmail: string;
  totalAssigned: number;
  totalCompleted: number;
  completedOnTime: number;
  completedLate: number;
  overdue: number;
  avgCompletionTime: number;
  completionRate: number;
  onTimeRate: number;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    due_date: string;
    completed_at: string | null;
    wasLate: boolean;
  }>;
}

export const TaskEmployeePerformance = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("totalCompleted");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: employeeData, isLoading } = useQuery({
    queryKey: ["employee-task-performance"],
    queryFn: async (): Promise<EmployeeTaskData[]> => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Fetch alle taken deze maand met user info
      const { data: tasks } = await supabase
        .from("tasks")
        .select(`
          id, title, status, due_date, completed_at, created_at,
          assigned_to
        `)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString())
        .not("assigned_to", "is", null);

      if (!tasks) return [];

      // Fetch user profiles om namen te krijgen
      const userIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);

      const profileMap = new Map(
        profiles?.map(p => [
          p.id, 
          { 
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Onbekend',
            email: p.email || ''
          }
        ]) || []
      );

      // Groepeer taken per medewerker
      const employeeMap = new Map<string, EmployeeTaskData>();

      tasks.forEach(task => {
        const userId = task.assigned_to;
        if (!userId) return;

        const profile = profileMap.get(userId);
        if (!profile) return;

        if (!employeeMap.has(userId)) {
          employeeMap.set(userId, {
            userId,
            userName: profile.name,
            userEmail: profile.email,
            totalAssigned: 0,
            totalCompleted: 0,
            completedOnTime: 0,
            completedLate: 0,
            overdue: 0,
            avgCompletionTime: 0,
            completionRate: 0,
            onTimeRate: 0,
            recentTasks: []
          });
        }

        const employee = employeeMap.get(userId)!;
        employee.totalAssigned++;

        const isCompleted = task.status === "voltooid";
        const isOverdue = !isCompleted && task.due_date && new Date(task.due_date) < now;
        const wasLate = isCompleted && task.completed_at && task.due_date && 
                        new Date(task.completed_at) > new Date(task.due_date);

        if (isCompleted) {
          employee.totalCompleted++;
          if (wasLate) {
            employee.completedLate++;
          } else {
            employee.completedOnTime++;
          }
        }

        if (isOverdue) {
          employee.overdue++;
        }

        // Voeg toe aan recente taken (max 5)
        if (employee.recentTasks.length < 5) {
          employee.recentTasks.push({
            id: task.id,
            title: task.title,
            status: task.status,
            due_date: task.due_date,
            completed_at: task.completed_at,
            wasLate: wasLate || false
          });
        }
      });

      // Bereken percentages en gemiddelden
      const employees = Array.from(employeeMap.values()).map(emp => {
        // Bereken gemiddelde afhandeltijd
        const completedWithTimes = tasks.filter(t => 
          t.assigned_to === emp.userId && 
          t.status === "voltooid" && 
          t.completed_at && 
          t.created_at
        );

        const avgTime = completedWithTimes.length > 0
          ? completedWithTimes.reduce((sum, t) => 
              sum + differenceInHours(new Date(t.completed_at!), new Date(t.created_at)), 0
            ) / completedWithTimes.length
          : 0;

        return {
          ...emp,
          avgCompletionTime: avgTime,
          completionRate: emp.totalAssigned > 0 ? (emp.totalCompleted / emp.totalAssigned) * 100 : 0,
          onTimeRate: emp.totalCompleted > 0 ? (emp.completedOnTime / emp.totalCompleted) * 100 : 0
        };
      });

      return employees;
    },
    refetchInterval: 60000
  });

  // Filter en sorteer
  const filteredData = React.useMemo(() => {
    if (!employeeData) return [];
    
    let filtered = employeeData.filter(emp => 
      emp.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof EmployeeTaskData] as number;
      const bValue = b[sortBy as keyof EmployeeTaskData] as number;
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [employeeData, searchTerm, sortBy, sortOrder]);

  const getPerformanceBadge = (onTimeRate: number) => {
    if (onTimeRate >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (onTimeRate >= 75) return <Badge className="bg-blue-500">Goed</Badge>;
    if (onTimeRate >= 60) return <Badge className="bg-yellow-500">Gemiddeld</Badge>;
    return <Badge variant="destructive">Aandacht nodig</Badge>;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Medewerker Performance
            </CardTitle>
            
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek medewerker..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:w-[200px]"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalCompleted">Voltooid</SelectItem>
                  <SelectItem value="onTimeRate">Op Tijd %</SelectItem>
                  <SelectItem value="totalAssigned">Toegewezen</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Employee Cards */}
      <div className="space-y-4">
        {filteredData.map((employee) => (
          <Card key={employee.userId} className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{employee.userName}</h3>
                      <p className="text-sm text-muted-foreground">{employee.userEmail}</p>
                    </div>
                  </div>
                  {getPerformanceBadge(employee.onTimeRate)}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Toegewezen</p>
                    <p className="text-2xl font-bold">{employee.totalAssigned}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Voltooid</p>
                    <p className="text-2xl font-bold text-green-600">{employee.totalCompleted}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Op Tijd</p>
                    <p className="text-2xl font-bold text-blue-600">{employee.completedOnTime}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Te Laat</p>
                    <p className="text-2xl font-bold text-red-600">{employee.completedLate}</p>
                  </div>
                </div>

                {/* Rates */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                    <p className="text-xl font-bold">{employee.completionRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">On-Time Rate</p>
                    <p className="text-xl font-bold text-blue-600">{employee.onTimeRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Gem. Afhandeltijd</p>
                    <p className="text-xl font-bold">{employee.avgCompletionTime.toFixed(1)}u</p>
                  </div>
                </div>

                {/* Recent Tasks Preview */}
                {employee.recentTasks.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Recente Taken ({employee.recentTasks.length})
                    </h4>
                    <div className="space-y-2">
                      {employee.recentTasks.map((task) => (
                        <div key={task.id} className="bg-muted/50 rounded p-2 text-sm flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Deadline: {new Date(task.due_date).toLocaleDateString('nl-NL')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.status === "voltooid" ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                {task.wasLate && (
                                  <Badge variant="destructive" className="text-xs">Te laat</Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {task.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overdue Warning */}
                {employee.overdue > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {employee.overdue} openstaande taken te laat
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredData.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Geen medewerker data gevonden</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Probeer andere zoektermen" 
                  : "Er zijn geen taken toegewezen deze maand"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
