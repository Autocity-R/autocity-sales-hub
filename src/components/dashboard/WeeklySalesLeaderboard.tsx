import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklySalesData {
  id: string;
  salesperson_id: string;
  salesperson_name: string;
  week_start_date: string;
  week_end_date: string;
  b2b_sales: number;
  b2c_sales: number;
  total_sales: number;
}

const WeeklySalesLeaderboard = () => {
  const { data: weeklyStats, isLoading } = useQuery({
    queryKey: ["weeklySalesLeaderboard"],
    queryFn: async (): Promise<WeeklySalesData[]> => {
      // Calculate current week start (Monday)
      const now = new Date();
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startOfWeek.setDate(diff);
      const weekStartString = startOfWeek.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('weekly_sales')
        .select('*')
        .gte('week_start_date', weekStartString)
        .order('total_sales', { ascending: false })
        .order('b2c_sales', { ascending: false });

      if (error) {
        console.error("Error fetching weekly sales:", error);
        throw error;
      }

      return data || [];
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white";
      default:
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800";
    }
  };

  const getCurrentWeekRange = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      start: startOfWeek.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
      end: endOfWeek.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    };
  };

  const weekRange = getCurrentWeekRange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Wekelijkse Verkoop Ranglijst
          </CardTitle>
          <CardDescription>Laden...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Wekelijkse Verkoop Ranglijst
        </CardTitle>
        <CardDescription>
          Week van {weekRange.start} - {weekRange.end} • Reset elke maandag 08:00
        </CardDescription>
      </CardHeader>
      <CardContent>
        {weeklyStats && weeklyStats.length > 0 ? (
          <div className="space-y-3">
            {weeklyStats.map((salesperson, index) => {
              const rank = index + 1;
              const isWinner = rank === 1;
              
              return (
                <div
                  key={salesperson.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-all duration-200",
                    isWinner 
                      ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-md" 
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      isWinner ? "bg-yellow-100" : "bg-background"
                    )}>
                      {getRankIcon(rank)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {salesperson.salesperson_name}
                        </span>
                        {isWinner && (
                          <Badge className={getRankBadgeColor(rank)}>
                            🏆 #1 Verkoper
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rangpositie #{rank}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-right">
                    <div className="text-center">
                      <div className="text-sm font-medium text-blue-600">
                        {salesperson.b2b_sales}
                      </div>
                      <div className="text-xs text-muted-foreground">B2B</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-green-600">
                        {salesperson.b2c_sales}
                      </div>
                      <div className="text-xs text-muted-foreground">B2C</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={cn(
                        "text-lg font-bold",
                        isWinner ? "text-yellow-600" : "text-foreground"
                      )}>
                        {salesperson.total_sales}
                      </div>
                      <div className="text-xs text-muted-foreground">Totaal</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nog geen verkopen deze week. De competitie kan beginnen! 🚀
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklySalesLeaderboard;