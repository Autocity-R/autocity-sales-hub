import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  
  const { data: weeklyStats, isLoading } = useQuery({
    queryKey: ["weeklySalesLeaderboard"],
    queryFn: async (): Promise<WeeklySalesData[]> => {
      // Bereken huidige week (maandag 00:00 t/m zondag 23:59)
      const now = new Date();
      const currentWeekStart = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      currentWeekStart.setDate(diff);
      currentWeekStart.setHours(0, 0, 0, 0);

      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
      currentWeekEnd.setHours(23, 59, 59, 999);

      console.log('📊 Fetching weekly sales for:', {
        start: currentWeekStart.toISOString(),
        end: currentWeekEnd.toISOString()
      });

      // CRITICAL: Only count verkocht_b2b and verkocht_b2c, NOT afgeleverd
      // Afgeleverd is delivery date, not sales date
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          status,
          sold_date,
          sold_by_user_id,
          details
        `)
        .in('status', ['verkocht_b2b', 'verkocht_b2c'])
        .not('sold_date', 'is', null)
        .not('sold_by_user_id', 'is', null)
        .gte('sold_date', currentWeekStart.toISOString())
        .lte('sold_date', currentWeekEnd.toISOString());

      if (error) {
        console.error("❌ Error fetching vehicles:", error);
        throw error;
      }

      console.log(`✅ Found ${vehicles?.length || 0} vehicles sold this week`);

      // Groepeer per verkoper
      const salespersonMap = new Map<string, WeeklySalesData>();
      
      // Fetch profile data separately to avoid foreign key errors
      const userIds = [...new Set(vehicles?.map(v => v.sold_by_user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      vehicles?.forEach((vehicle) => {
        const sellerId = vehicle.sold_by_user_id;
        if (!sellerId) return;

        const profile = profileMap.get(sellerId);
        
        // Bepaal de naam van de verkoper
        let salespersonName = 'Onbekende verkoper';
        if (profile) {
          if (profile.first_name && profile.last_name) {
            salespersonName = `${profile.first_name} ${profile.last_name}`;
          } else if (profile.email) {
            salespersonName = profile.email;
          }
        }
        
        // Fallback naar details als profile niet beschikbaar is
        if (salespersonName === 'Onbekende verkoper' && vehicle.details) {
          const details = vehicle.details as any;
          if (details.salespersonName) {
            salespersonName = details.salespersonName;
          }
        }
        
        if (!salespersonMap.has(sellerId)) {
          salespersonMap.set(sellerId, {
            id: sellerId,
            salesperson_id: sellerId,
            salesperson_name: salespersonName,
            week_start_date: currentWeekStart.toISOString().split('T')[0],
            week_end_date: currentWeekEnd.toISOString().split('T')[0],
            b2b_sales: 0,
            b2c_sales: 0,
            total_sales: 0
          });
        }
        
        const salesperson = salespersonMap.get(sellerId)!;
        
        // Tel het juiste type verkoop
        if (vehicle.status === 'verkocht_b2b') {
          salesperson.b2b_sales++;
        } else if (vehicle.status === 'verkocht_b2c' || vehicle.status === 'afgeleverd') {
          salesperson.b2c_sales++;
        }
        
        salesperson.total_sales++;
      });

      // Converteer naar array en sorteer op total_sales (desc), dan b2c_sales (desc)
      const result = Array.from(salespersonMap.values())
        .sort((a, b) => {
          if (b.total_sales !== a.total_sales) {
            return b.total_sales - a.total_sales;
          }
          return b.b2c_sales - a.b2c_sales;
        });

      console.log('📈 Weekly sales result:', result);
      
      return result;
    },
    staleTime: 60 * 1000, // Consider data fresh for 60 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds (reduced from 30s)
  });

  // Real-time updates voor directe feedback
  useEffect(() => {
    const channel = supabase
      .channel('weekly-sales-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'vehicles',
          filter: 'status=in.(verkocht_b2b,verkocht_b2c,afgeleverd)'
        },
        (payload) => {
          console.log('🔔 Vehicle sale changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["weeklySalesLeaderboard"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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