import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportPeriod } from "@/types/reports";
import { supplierReportsService } from "@/services/supplierReportsService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend, ScatterChart, Scatter, ZAxis, ComposedChart, Line } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, Euro, Percent, Clock, Trophy, Zap, Target, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight, Building2, Users, Star, AlertTriangle, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReliabilityTier } from "@/types/reports";

interface SupplierAnalyticsProps {
  period: ReportPeriod;
}

type ViewFilter = 'all' | 'b2b' | 'b2c';

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Top Performer';
  if (score >= 60) return 'Goed';
  if (score >= 40) return 'Gemiddeld';
  if (score >= 20) return 'Onder Benchmark';
  return 'Kritiek';
};

const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  if (score >= 40) return 'outline';
  return 'destructive';
};

const getReliabilityInfo = (tier: ReliabilityTier, sold: number): { 
  label: string; 
  color: string; 
  icon: 'shield' | 'star' | 'warning';
  description: string;
} => {
  switch (tier) {
    case 'premium':
      return { 
        label: 'Zeer Betrouwbaar', 
        color: 'text-green-500', 
        icon: 'shield',
        description: `${sold} verkopen - Statistisch zeer betrouwbaar`
      };
    case 'regular':
      return { 
        label: 'Betrouwbaar', 
        color: 'text-blue-500', 
        icon: 'star',
        description: `${sold} verkopen - Betrouwbare data`
      };
    case 'small':
      return { 
        label: 'Indicatief', 
        color: 'text-yellow-500', 
        icon: 'star',
        description: `${sold} verkopen - Data is indicatief`
      };
    case 'new':
      return { 
        label: 'Onbetrouwbaar', 
        color: 'text-orange-500', 
        icon: 'warning',
        description: `${sold} verkopen - Te weinig data voor betrouwbare analyse`
      };
  }
};

const ReliabilityIndicator: React.FC<{ 
  tier: ReliabilityTier; 
  stars: 1 | 2 | 3; 
  sold: number;
}> = ({ tier, stars, sold }) => {
  const info = getReliabilityInfo(tier, sold);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-0.5", info.color)}>
            {info.icon === 'shield' && <ShieldCheck className="h-3 w-3" />}
            {info.icon === 'warning' && <AlertTriangle className="h-3 w-3" />}
            {info.icon === 'star' && (
              <>
                {[...Array(stars)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
                {[...Array(3 - stars)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 opacity-30" />
                ))}
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{info.label}</p>
          <p className="text-xs text-muted-foreground">{info.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const SupplierAnalytics: React.FC<SupplierAnalyticsProps> = ({ period }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("performanceScore");
  const [showAllTime, setShowAllTime] = useState(true);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showOnlyReliable, setShowOnlyReliable] = useState(true); // Default: only show reliable data
  const queryClient = useQueryClient();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['supplierAnalytics', period, showAllTime],
    queryFn: () => supplierReportsService.getSupplierAnalytics(period, showAllTime)
  });

  // Real-time updates voor voertuigen
  useEffect(() => {
    const channel = supabase
      .channel('supplier-analytics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        () => queryClient.invalidateQueries({ queryKey: ['supplierAnalytics'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => queryClient.invalidateQueries({ queryKey: ['supplierAnalytics'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Helper function to get view-specific stats
  const getViewStats = (supplier: typeof analytics.suppliers[0], view: ViewFilter) => {
    if (view === 'b2b') {
      return {
        sold: supplier.b2b.sold,
        profit: supplier.b2b.profit,
        margin: supplier.b2b.margin,
        revenue: supplier.b2b.revenue,
        avgDaysToSell: supplier.b2b.avgDaysToSell,
        annualizedROI: supplier.b2b.annualizedROI,
        profitPerDay: supplier.b2b.profitPerDay,
        avgProfitPerVehicle: supplier.b2b.avgProfitPerVehicle,
        avgPurchasePrice: supplier.b2b.avgPurchasePrice,
        avgSalesPrice: supplier.b2b.avgSalesPrice,
        // Use total for these as they're not channel-specific
        inStock: supplier.inStock,
        performanceScore: supplier.performanceScore,
        basePerformanceScore: supplier.basePerformanceScore,
        volumeFactor: supplier.volumeFactor,
        sellThroughRate: supplier.b2b.sold / (supplier.b2b.sold + supplier.inStock) * 100 || 0,
        fastestSale: supplier.fastestSale,
        slowestSale: supplier.slowestSale,
        profitMargin: supplier.b2b.margin,
        // Channel-specific reliability (min 3 for channel)
        meetsMinimumThreshold: supplier.b2b.sold >= 3,
      };
    }
    if (view === 'b2c') {
      return {
        sold: supplier.b2c.sold,
        profit: supplier.b2c.profit,
        margin: supplier.b2c.margin,
        revenue: supplier.b2c.revenue,
        avgDaysToSell: supplier.b2c.avgDaysToSell,
        annualizedROI: supplier.b2c.annualizedROI,
        profitPerDay: supplier.b2c.profitPerDay,
        avgProfitPerVehicle: supplier.b2c.avgProfitPerVehicle,
        avgPurchasePrice: supplier.b2c.avgPurchasePrice,
        avgSalesPrice: supplier.b2c.avgSalesPrice,
        inStock: supplier.inStock,
        performanceScore: supplier.performanceScore,
        basePerformanceScore: supplier.basePerformanceScore,
        volumeFactor: supplier.volumeFactor,
        sellThroughRate: supplier.b2c.sold / (supplier.b2c.sold + supplier.inStock) * 100 || 0,
        fastestSale: supplier.fastestSale,
        slowestSale: supplier.slowestSale,
        profitMargin: supplier.b2c.margin,
        meetsMinimumThreshold: supplier.b2c.sold >= 3,
      };
    }
    // All view - return total stats (use totalSalesValue for revenue)
    return {
      sold: supplier.sold,
      profit: supplier.profit,
      margin: supplier.profitMargin,
      revenue: supplier.totalSalesValue,
      avgDaysToSell: supplier.avgDaysToSell,
      annualizedROI: supplier.annualizedROI,
      profitPerDay: supplier.profitPerDay,
      avgProfitPerVehicle: supplier.avgProfitPerVehicle,
      avgPurchasePrice: supplier.avgPurchasePrice,
      avgSalesPrice: supplier.avgSalesPrice,
      inStock: supplier.inStock,
      performanceScore: supplier.performanceScore,
      basePerformanceScore: supplier.basePerformanceScore,
      volumeFactor: supplier.volumeFactor,
      sellThroughRate: supplier.sellThroughRate,
      fastestSale: supplier.fastestSale,
      slowestSale: supplier.slowestSale,
      profitMargin: supplier.profitMargin,
      meetsMinimumThreshold: supplier.meetsMinimumThreshold,
    };
  };

  // Get minimum threshold based on view (5 for all, 3 for channel-specific)
  const getMinThreshold = (view: ViewFilter) => view === 'all' ? 5 : 3;

  // Filter suppliers based on view, search, and reliability
  const filteredSuppliers = analytics?.suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Filter by channel first
    if (viewFilter === 'b2b' && s.b2b.sold === 0) return false;
    if (viewFilter === 'b2c' && s.b2c.sold === 0) return false;
    
    // Reliability filter based on view-specific threshold
    if (showOnlyReliable) {
      const viewStats = getViewStats(s, viewFilter);
      if (!viewStats.meetsMinimumThreshold) return false;
    }
    
    return true;
  }).sort((a, b) => {
    const aStats = getViewStats(a, viewFilter);
    const bStats = getViewStats(b, viewFilter);
    
    // Map sortBy to the correct property
    const sortMap: Record<string, keyof typeof aStats> = {
      performanceScore: 'performanceScore',
      annualizedROI: 'annualizedROI',
      profitPerDay: 'profitPerDay',
      profit: 'profit',
      profitMargin: 'profitMargin',
      sellThroughRate: 'sellThroughRate',
      avgDaysToSell: 'avgDaysToSell',
      inventoryTurnover: 'sold', // Use sold as proxy
      totalVehicles: 'sold',
      b2bROI: 'annualizedROI',
      b2cROI: 'annualizedROI',
    };
    
    const key = sortMap[sortBy] || 'performanceScore';
    const aValue = aStats[key] as number;
    const bValue = bStats[key] as number;
    
    // For avgDaysToSell, lower is better
    if (sortBy === 'avgDaysToSell') {
      return aValue - bValue;
    }
    
    return bValue - aValue;
  }) || [];
  
  // Count unreliable suppliers for info
  const unreliableCount = analytics?.suppliers.filter(s => !s.meetsMinimumThreshold).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  if (analytics.suppliers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          <div className="inline-flex rounded-lg border p-1 bg-muted">
            <Button variant={showAllTime ? "default" : "ghost"} size="sm" onClick={() => setShowAllTime(true)}>
              Alle tijd
            </Button>
            <Button variant={!showAllTime ? "default" : "ghost"} size="sm" onClick={() => setShowAllTime(false)}>
              Periode filter
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Geen leveranciersdata gevonden voor deze selectie.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex rounded-lg border p-1 bg-muted">
            <Button 
              variant={viewFilter === 'all' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setViewFilter('all')}
            >
              Alle Verkopen
            </Button>
            <Button 
              variant={viewFilter === 'b2b' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setViewFilter('b2b')}
              className="gap-1"
            >
              <Building2 className="h-3 w-3" /> B2B
            </Button>
            <Button 
              variant={viewFilter === 'b2c' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setViewFilter('b2c')}
              className="gap-1"
            >
              <Users className="h-3 w-3" /> B2C
            </Button>
          </div>
          
          {/* Reliability Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50">
            <Switch 
              id="reliability-filter"
              checked={showOnlyReliable} 
              onCheckedChange={setShowOnlyReliable}
            />
            <Label htmlFor="reliability-filter" className="text-sm cursor-pointer">
              Alleen betrouwbaar (5+)
            </Label>
            {unreliableCount > 0 && !showOnlyReliable && (
              <Badge variant="outline" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />
                {unreliableCount} onbetrouwbaar
              </Badge>
            )}
          </div>
        </div>
        
        <div className="inline-flex rounded-lg border p-1 bg-muted">
          <Button variant={showAllTime ? "default" : "ghost"} size="sm" onClick={() => setShowAllTime(true)}>
            Alle tijd
          </Button>
          <Button variant={!showAllTime ? "default" : "ghost"} size="sm" onClick={() => setShowAllTime(false)}>
            Periode filter
          </Button>
        </div>
      </div>

      {/* Dynamic KPI Cards based on view */}
      {(() => {
        // Calculate view-specific KPIs
        const minThreshold = getMinThreshold(viewFilter);
        const reliableSuppliers = analytics.suppliers.filter(s => {
          const stats = getViewStats(s, viewFilter);
          return stats.sold >= minThreshold;
        });
        
        const viewBestPerformer = reliableSuppliers.sort((a, b) => {
          const aStats = getViewStats(a, viewFilter);
          const bStats = getViewStats(b, viewFilter);
          return bStats.performanceScore - aStats.performanceScore;
        })[0];
        
        const viewFastestTurnover = reliableSuppliers
          .filter(s => getViewStats(s, viewFilter).avgDaysToSell > 0)
          .sort((a, b) => {
            const aStats = getViewStats(a, viewFilter);
            const bStats = getViewStats(b, viewFilter);
            return aStats.avgDaysToSell - bStats.avgDaysToSell;
          })[0];
        
        const viewBestROI = reliableSuppliers.sort((a, b) => {
          const aStats = getViewStats(a, viewFilter);
          const bStats = getViewStats(b, viewFilter);
          return bStats.annualizedROI - aStats.annualizedROI;
        })[0];
        
        const viewHighestProfitPerDay = reliableSuppliers.sort((a, b) => {
          const aStats = getViewStats(a, viewFilter);
          const bStats = getViewStats(b, viewFilter);
          return bStats.profitPerDay - aStats.profitPerDay;
        })[0];
        
        const viewLabel = viewFilter === 'b2b' ? 'B2B' : viewFilter === 'b2c' ? 'B2C' : 'Totaal';
        
        // Calculate totals for current view
        const viewTotalProfit = analytics.suppliers.reduce((sum, s) => {
          const stats = getViewStats(s, viewFilter);
          return sum + stats.profit;
        }, 0);
        
        const viewTotalSold = analytics.suppliers.reduce((sum, s) => {
          const stats = getViewStats(s, viewFilter);
          return sum + stats.sold;
        }, 0);
        
        const viewTotalRevenue = analytics.suppliers.reduce((sum, s) => {
          const stats = getViewStats(s, viewFilter);
          return sum + stats.revenue;
        }, 0);
        
        const viewAvgMargin = viewTotalRevenue > 0 ? (viewTotalProfit / viewTotalRevenue) * 100 : 0;

        return (
          <>
            {/* Performance KPI Cards - Top Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Best Performer {viewLabel}</CardTitle>
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{viewBestPerformer?.name || '-'}</div>
                  <p className="text-xs text-muted-foreground">
                    Score: {viewBestPerformer ? getViewStats(viewBestPerformer, viewFilter).performanceScore : 0}/100
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Snelste Omloop {viewLabel}</CardTitle>
                  <Zap className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{viewFastestTurnover?.name || '-'}</div>
                  <p className="text-xs text-muted-foreground">
                    {viewFastestTurnover ? Math.round(getViewStats(viewFastestTurnover, viewFilter).avgDaysToSell) : 0} dagen gemiddeld
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Beste ROI {viewLabel}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{viewBestROI?.name || '-'}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(viewBestROI ? getViewStats(viewBestROI, viewFilter).annualizedROI : 0)} per jaar
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hoogste Winst/Dag {viewLabel}</CardTitle>
                  <Euro className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{viewHighestProfitPerDay?.name || '-'}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(viewHighestProfitPerDay ? getViewStats(viewHighestProfitPerDay, viewFilter).profitPerDay : 0)}/dag
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Totals KPI Cards - Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{viewLabel} Totaal Winst</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(viewTotalProfit)}</div>
                  <p className="text-xs text-muted-foreground">
                    {viewTotalSold} verkocht • Marge: {formatPercentage(viewAvgMargin)}
                  </p>
                </CardContent>
              </Card>

              {viewFilter === 'all' ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">B2B Totaal</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(analytics.totalB2BProfit)}</div>
                      <p className="text-xs text-muted-foreground">
                        {analytics.totalB2BSold} verkocht • Marge: {formatPercentage(analytics.avgB2BMargin)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">B2C Totaal</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(analytics.totalB2CProfit)}</div>
                      <p className="text-xs text-muted-foreground">
                        {analytics.totalB2CSold} verkocht • Marge: {formatPercentage(analytics.avgB2CMargin)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Gemiddelde Marge</CardTitle>
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatPercentage(analytics.avgMargin)}</div>
                      <p className="text-xs text-muted-foreground">
                        Over alle leveranciers
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{viewLabel} Gem. Winst/Auto</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(viewTotalSold > 0 ? viewTotalProfit / viewTotalSold : 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Per verkocht voertuig
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{viewLabel} Omzet</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(viewTotalRevenue)}</div>
                      <p className="text-xs text-muted-foreground">
                        Totale {viewLabel.toLowerCase()} omzet
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{viewLabel} Leveranciers</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.suppliers.filter(s => getViewStats(s, viewFilter).sold > 0).length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Actieve leveranciers
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </>
        );
      })()}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Performance Ranking Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Ranking</CardTitle>
            <CardDescription>Top leveranciers op totaalscore (0-100)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.performanceRanking} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'score') return [value, 'Score'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="score" fill="hsl(var(--primary))">
                  {analytics.performanceRanking.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.score >= 80 ? 'hsl(var(--chart-2))' : 
                            entry.score >= 60 ? 'hsl(var(--chart-1))' : 
                            entry.score >= 40 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* B2B vs B2C ROI Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>B2B vs B2C ROI Vergelijking</CardTitle>
            <CardDescription>Jaarlijks ROI per kanaal per leverancier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.b2bVsB2cComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <RechartsTooltip formatter={(value: number) => formatPercentage(value)} />
                <Legend />
                <Bar dataKey="b2bROI" name="B2B ROI" fill="hsl(var(--chart-1))" />
                <Bar dataKey="b2cROI" name="B2C ROI" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit per Day Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Winst per Dag</CardTitle>
            <CardDescription>Dagelijks rendement per leverancier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analytics.profitPerDayChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" tickFormatter={(v) => `€${v}`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}d`} />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'profitPerDay') return [formatCurrency(value), 'Winst/Dag'];
                    if (name === 'avgDays') return [`${value} dagen`, 'Gem. Stadagen'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="profitPerDay" name="Winst/Dag" fill="hsl(var(--chart-2))" />
                <Line yAxisId="right" type="monotone" dataKey="avgDays" name="Gem. Stadagen" stroke="hsl(var(--chart-3))" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* B2B vs B2C Profit */}
        <Card>
          <CardHeader>
            <CardTitle>B2B vs B2C Winst</CardTitle>
            <CardDescription>Absolute winst per kanaal</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.b2bVsB2cComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} />
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="b2bProfit" name="B2B Winst" fill="hsl(var(--chart-1))" />
                <Bar dataKey="b2cProfit" name="B2C Winst" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leverancier Performance Details</CardTitle>
          <CardDescription>Klik op een rij voor B2B/B2C breakdown</CardDescription>
          <div className="flex flex-wrap gap-4 mt-4">
            <Input
              placeholder="Zoek leverancier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Sorteer op..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performanceScore">Performance Score</SelectItem>
                <SelectItem value="annualizedROI">ROI (Jaarlijks)</SelectItem>
                <SelectItem value="profitPerDay">Winst per Dag</SelectItem>
                <SelectItem value="profit">Totale Winst</SelectItem>
                <SelectItem value="profitMargin">Marge %</SelectItem>
                <SelectItem value="sellThroughRate">Sell-Through %</SelectItem>
                <SelectItem value="avgDaysToSell">Sta Dagen</SelectItem>
                <SelectItem value="inventoryTurnover">Omloopsnelheid</SelectItem>
                <SelectItem value="totalVehicles">Aantal Voertuigen</SelectItem>
                <SelectItem value="b2bROI">B2B ROI</SelectItem>
                <SelectItem value="b2cROI">B2C ROI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Leverancier</TableHead>
                <TableHead className="text-center w-8">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Betrouwbaarheid</p>
                        <p className="text-xs text-muted-foreground">Gebaseerd op aantal verkopen</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-right">Verkocht</TableHead>
                <TableHead className="text-right">Voorraad</TableHead>
                <TableHead className="text-right">Sta Dagen</TableHead>
                <TableHead className="text-right">Winst</TableHead>
                <TableHead className="text-right">Marge</TableHead>
                <TableHead className="text-right">ROI (Jaar)</TableHead>
                <TableHead className="text-right">Winst/Dag</TableHead>
                <TableHead className="text-right">Sell-Through</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier, index) => {
                const viewStats = getViewStats(supplier, viewFilter);
                const viewLabel = viewFilter === 'b2b' ? 'B2B' : viewFilter === 'b2c' ? 'B2C' : '';
                
                return (
                <React.Fragment key={supplier.id}>
                  <TableRow 
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      !viewStats.meetsMinimumThreshold && "opacity-60"
                    )}
                    onClick={() => toggleRowExpansion(supplier.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {expandedRows.has(supplier.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{supplier.name}</span>
                        {viewFilter === 'all' && (
                          <div className="flex gap-1 mt-1">
                            {supplier.b2b.sold > 0 && (
                              <Badge variant="outline" className="text-xs">B2B: {supplier.b2b.sold}</Badge>
                            )}
                            {supplier.b2c.sold > 0 && (
                              <Badge variant="outline" className="text-xs">B2C: {supplier.b2c.sold}</Badge>
                            )}
                          </div>
                        )}
                        {viewFilter !== 'all' && (
                          <Badge variant="secondary" className="text-xs w-fit mt-1">{viewLabel}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ReliabilityIndicator 
                        tier={viewStats.sold >= 20 ? 'premium' : viewStats.sold >= 10 ? 'regular' : viewStats.sold >= 5 ? 'small' : 'new'} 
                        stars={viewStats.sold >= 20 ? 3 : viewStats.sold >= 10 ? 2 : 1} 
                        sold={viewStats.sold}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant={getScoreBadgeVariant(viewStats.performanceScore)}>
                                {viewStats.performanceScore}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Volume-gewogen score</p>
                              <p className="text-xs text-muted-foreground">
                                Basis: {viewStats.basePerformanceScore} × {(viewStats.volumeFactor * 100).toFixed(0)}% volume factor
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-xs text-muted-foreground">
                          {getScoreLabel(viewStats.performanceScore)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default">{viewStats.sold}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{viewStats.inStock}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{Math.round(viewStats.avgDaysToSell)}d</span>
                      </div>
                      {viewStats.fastestSale !== null && viewStats.slowestSale !== null && (
                        <div className="text-xs text-muted-foreground">
                          {viewStats.fastestSale}d - {viewStats.slowestSale}d
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={viewStats.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(viewStats.profit)}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(viewStats.avgProfitPerVehicle)}/auto
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={viewStats.profitMargin > 15 ? 'default' : viewStats.profitMargin > 10 ? 'secondary' : 'destructive'}>
                        {formatPercentage(viewStats.profitMargin)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {viewStats.annualizedROI > 100 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-500" />
                        )}
                        <span className={viewStats.annualizedROI > 100 ? 'text-green-600 font-medium' : ''}>
                          {formatPercentage(viewStats.annualizedROI)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={viewStats.profitPerDay > 50 ? 'text-green-600 font-medium' : ''}>
                        {formatCurrency(viewStats.profitPerDay)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={viewStats.sellThroughRate > 80 ? 'default' : viewStats.sellThroughRate > 50 ? 'secondary' : 'outline'}>
                        {formatPercentage(viewStats.sellThroughRate)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded B2B/B2C Details */}
                  {expandedRows.has(supplier.id) && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={12}>
                        <div className="py-4 px-2">
                          <div className="grid grid-cols-2 gap-4">
                            {/* B2B Details */}
                            <div className="border rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Building2 className="h-4 w-4" />
                                <span className="font-semibold">B2B Performance</span>
                              </div>
                              {supplier.b2b.sold > 0 ? (
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Verkocht:</span>
                                    <span className="ml-2 font-medium">{supplier.b2b.sold}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Winst:</span>
                                    <span className={cn("ml-2 font-medium", supplier.b2b.profit > 0 ? "text-green-600" : "text-red-600")}>
                                      {formatCurrency(supplier.b2b.profit)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Marge:</span>
                                    <span className="ml-2 font-medium">{formatPercentage(supplier.b2b.margin)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Sta Dagen:</span>
                                    <span className="ml-2 font-medium">{Math.round(supplier.b2b.avgDaysToSell)}d</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">ROI (Jaar):</span>
                                    <span className={cn("ml-2 font-medium", supplier.b2b.annualizedROI > 100 ? "text-green-600" : "")}>
                                      {formatPercentage(supplier.b2b.annualizedROI)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Winst/Dag:</span>
                                    <span className={cn("ml-2 font-medium", supplier.b2b.profitPerDay > 50 ? "text-green-600" : "")}>
                                      {formatCurrency(supplier.b2b.profitPerDay)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Gem. Inkoop:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(supplier.b2b.avgPurchasePrice)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Gem. Verkoop:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(supplier.b2b.avgSalesPrice)}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Geen B2B verkopen</p>
                              )}
                            </div>
                            
                            {/* B2C Details */}
                            <div className="border rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4" />
                                <span className="font-semibold">B2C Performance</span>
                              </div>
                              {supplier.b2c.sold > 0 ? (
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Verkocht:</span>
                                    <span className="ml-2 font-medium">{supplier.b2c.sold}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Winst:</span>
                                    <span className={cn("ml-2 font-medium", supplier.b2c.profit > 0 ? "text-green-600" : "text-red-600")}>
                                      {formatCurrency(supplier.b2c.profit)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Marge:</span>
                                    <span className="ml-2 font-medium">{formatPercentage(supplier.b2c.margin)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Sta Dagen:</span>
                                    <span className="ml-2 font-medium">{Math.round(supplier.b2c.avgDaysToSell)}d</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">ROI (Jaar):</span>
                                    <span className={cn("ml-2 font-medium", supplier.b2c.annualizedROI > 100 ? "text-green-600" : "")}>
                                      {formatPercentage(supplier.b2c.annualizedROI)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Winst/Dag:</span>
                                    <span className={cn("ml-2 font-medium", supplier.b2c.profitPerDay > 50 ? "text-green-600" : "")}>
                                      {formatCurrency(supplier.b2c.profitPerDay)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Gem. Inkoop:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(supplier.b2c.avgPurchasePrice)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Gem. Verkoop:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(supplier.b2c.avgSalesPrice)}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Geen B2C verkopen</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Channel Comparison */}
                          {supplier.b2b.sold > 0 && supplier.b2c.sold > 0 && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <span className="text-sm font-medium">Kanaal Analyse: </span>
                              <span className="text-sm">
                                {supplier.preferredChannel === 'b2b' && 'B2B presteert beter'}
                                {supplier.preferredChannel === 'b2c' && 'B2C presteert beter'}
                                {supplier.preferredChannel === 'mixed' && 'Beide kanalen presteren vergelijkbaar'}
                                {' '}(ROI verschil: {formatPercentage(supplier.channelEfficiencyGap)})
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
