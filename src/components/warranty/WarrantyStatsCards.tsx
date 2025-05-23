
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  Clock, 
  Euro, 
  Star, 
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { WarrantyStats } from "@/types/warranty";

interface WarrantyStatsCardsProps {
  stats?: WarrantyStats;
  isLoading: boolean;
}

export const WarrantyStatsCards: React.FC<WarrantyStatsCardsProps> = ({ 
  stats, 
  isLoading 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statsCards = [
    {
      title: "Actieve Claims",
      value: stats.totalActive,
      description: "Momenteel actief",
      icon: Shield,
      color: "text-blue-600"
    },
    {
      title: "Deze Maand",
      value: stats.totalThisMonth,
      description: "Nieuwe claims",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Gem. Oplostijd",
      value: `${stats.avgResolutionDays} dagen`,
      description: "Doorlooptijd",
      icon: Clock,
      color: "text-orange-600"
    },
    {
      title: "Klanttevredenheid",
      value: `${stats.customerSatisfactionAvg}/5`,
      description: "Gemiddelde score",
      icon: Star,
      color: "text-yellow-600"
    },
    {
      title: "Kosten Deze Maand",
      value: formatCurrency(stats.totalCostThisMonth),
      description: "Garantiekosten",
      icon: Euro,
      color: "text-red-600"
    },
    {
      title: "Wachtend",
      value: stats.pendingClaims,
      description: "In behandeling",
      icon: AlertTriangle,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statsCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
