
import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { AdaptiveGrid } from "@/components/layout/AdaptiveGrid";
import StatCard from "@/components/dashboard/StatCard";
import MonthlySalesChart from "@/components/dashboard/MonthlySalesChart";
import AiAssistant from "@/components/dashboard/AiAssistant";
import WeeklySalesLeaderboard from "@/components/dashboard/WeeklySalesLeaderboard";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useResponsive } from "@/hooks/useResponsive";
import { Database, Package, Truck, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { isLargeDesktop } = useResponsive();

  return (
    <DashboardLayout>
      <ResponsiveContainer maxWidth="wide">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">AutoCity Sales Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welkom terug! Hier is een overzicht van de huidige status.
          </p>
        </div>

        {/* KPI Cards */}
        <AdaptiveGrid type="dashboard" className="mb-8">
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
        </AdaptiveGrid>

        {/* Main Content Grid */}
        <div className={isLargeDesktop ? "grid grid-cols-3 gap-8" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
          {/* Sales Chart */}
          <div className={isLargeDesktop ? "col-span-2" : "col-span-1 lg:col-span-2"}>
            <MonthlySalesChart />
          </div>

          {/* AI Assistant */}
          <div className="col-span-1">
            <AiAssistant />
          </div>

          {/* Weekly Sales Leaderboard */}
          <div className={isLargeDesktop ? "col-span-3" : "col-span-1 lg:col-span-2"}>
            <WeeklySalesLeaderboard />
          </div>
        </div>
      </ResponsiveContainer>
    </DashboardLayout>
  );
};

export default Index;
