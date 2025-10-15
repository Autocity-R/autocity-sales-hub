
import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import MonthlySalesChart from "@/components/dashboard/MonthlySalesChart";
import AiAssistant from "@/components/dashboard/AiAssistant";
import WeeklySalesLeaderboard from "@/components/dashboard/WeeklySalesLeaderboard";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Database, Package, Truck, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">AutoCity Sales Dashboard</h2>
        <p className="text-muted-foreground">
          Welkom terug! Hier is een overzicht van de huidige status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Voertuigen binnen"
              value={stats?.voorraad || 0}
              icon={<Database className="w-4 h-4" />}
              description="Totaal aantal voertuigen in voorraad"
            />
            <StatCard
              title="Voertuigen onderweg"
              value={stats?.transport || 0}
              icon={<Truck className="w-4 h-4" />}
              description="Voertuigen in transport"
            />
            <StatCard
              title="Openstaande Garantie"
              value={stats?.garantie || 0}
              icon={<ShieldCheck className="w-4 h-4" />}
              description="Actieve garantieclaims"
            />
            <StatCard
              title="Verkocht deze maand"
              value={stats?.verkocht || 0}
              icon={<Package className="w-4 h-4" />}
              description="Totaal aantal verkochte voertuigen"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-1 mt-6">
        <MonthlySalesChart />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mt-6">
        <AiAssistant />
        <WeeklySalesLeaderboard />
      </div>
    </DashboardLayout>
  );
};

export default Index;
