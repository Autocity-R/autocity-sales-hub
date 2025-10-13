import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskPerformanceOverview } from "@/components/reports/TaskPerformanceOverview";
import { TaskEmployeePerformance } from "@/components/reports/TaskEmployeePerformance";
import { ClipboardList } from "lucide-react";

const TasksAnalytics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Taken Analytics"
          description="Inzicht in taken performance en medewerker productiviteit"
          icon={ClipboardList}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="employees">Per Medewerker</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <TaskPerformanceOverview />
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <TaskEmployeePerformance />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TasksAnalytics;
