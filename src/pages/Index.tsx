
import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import InventoryChart from "@/components/dashboard/InventoryChart";
import LeadTimeChart from "@/components/dashboard/LeadTimeChart";
import AiAssistant from "@/components/dashboard/AiAssistant";
import RecentLeads from "@/components/dashboard/RecentLeads";
import { Database, Package, Truck, User } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">AutoCity Sales Dashboard</h2>
        <p className="text-muted-foreground">
          Welkom terug! Hier is een overzicht van de huidige status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <StatCard
          title="Voertuigen binnen"
          value="128"
          icon={<Database className="w-4 h-4" />}
          description="Totaal aantal voertuigen in voorraad"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Voertuigen onderweg"
          value="35"
          icon={<Truck className="w-4 h-4" />}
          description="Voertuigen in transport"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Open Leads"
          value="42"
          icon={<User className="w-4 h-4" />}
          description="Actieve leads in pipeline"
          trend={{ value: 5, positive: false }}
        />
        <StatCard
          title="Verkocht deze maand"
          value="63"
          icon={<Package className="w-4 h-4" />}
          description="Totaal aantal verkochte voertuigen"
          trend={{ value: 18, positive: true }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <InventoryChart />
        <LeadTimeChart />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mt-6">
        <RecentLeads />
        <AiAssistant />
      </div>
    </DashboardLayout>
  );
};

export default Index;
