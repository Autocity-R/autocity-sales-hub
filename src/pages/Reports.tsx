
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Car,
  Calendar,
  Download,
  BarChart3,
  Database,
  Settings
} from "lucide-react";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { SalesChart } from "@/components/reports/SalesChart";
import { TopVehiclesChart } from "@/components/reports/TopVehiclesChart";
import { ExactOnlineStatus } from "@/components/reports/ExactOnlineStatus";
import { DataSourceIndicator } from "@/components/common/DataSourceIndicator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { enhancedReportsService } from "@/services/enhancedReportsService";
import { systemReportsService } from "@/services/systemReportsService";
import { ReportPeriod, PerformanceData } from "@/types/reports";
import { SalespersonPerformance } from "@/components/reports/SalespersonPerformance";
import { SalesAnalytics } from "@/components/reports/SalesAnalytics";
import { WarrantyReports } from "@/components/reports/WarrantyReports";
import { PurchaseAnalytics } from "@/components/reports/PurchaseAnalytics";
import { SupplierAnalytics } from "@/components/reports/SupplierAnalytics";

interface MockPerformanceData extends PerformanceData {
  revenue: number;
  profit: number;
  vehiclesSold: number;
  averageSalePrice: number;
  revenueGrowth: number;
  profitMargin: number;
  revenueChart: Array<{ month: string; revenue: number; profit: number }>;
  salesChart: Array<{ category: string; b2c: number; b2b: number }>;
  topVehicles: Array<{ model: string; brand: string; sales: number; revenue: number }>;
  _metadata: {
    dataSource: string;
    lastUpdated: string;
    recordCounts: {
      salesInvoices: number;
    };
  };
}

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("currentMonth");
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const queryClient = useQueryClient();
  
  // Generate report period based on selection
  const reportPeriod: ReportPeriod = React.useMemo(() => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case "currentWeek":
        // Get Monday of current week (week starts on Monday)
        const currentDay = now.getDay();
        const diff = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday (0), go back 6 days, otherwise go to Monday
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return {
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          label: "Huidige week",
          type: "week" as const
        };
      
      case "currentYear":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        yearStart.setHours(0, 0, 0, 0);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        yearEnd.setHours(23, 59, 59, 999);
        
        return {
          startDate: yearStart.toISOString(),
          endDate: yearEnd.toISOString(),
          label: "Huidig jaar",
          type: "year" as const
        };
      
      default: // currentMonth
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        return {
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
          label: "Huidige maand",
          type: "month" as const
        };
    }
  }, [selectedPeriod]);

  // Mock data for fallback
  const mockReportsData: MockPerformanceData = {
    period: reportPeriod,
    sales: {
      totalSales: 158,
      totalRevenue: 6420000,
      averageMargin: 15.4,
      totalUnits: 158,
      conversionRate: 72.5
    },
    leads: {
      totalLeads: 218,
      responseTime: 2.8,
      conversionRate: 72.5,
      followUpRate: 89.2,
      avgDaysToClose: 14.2
    },
    vehicleTypes: [
      { type: "BMW", unitsSold: 45, revenue: 1800000, margin: 15.2, percentage: 28.5 },
      { type: "Mercedes", unitsSold: 38, revenue: 1950000, margin: 18.7, percentage: 24.1 },
      { type: "Audi", unitsSold: 42, revenue: 1680000, margin: 14.8, percentage: 26.6 },
      { type: "Volkswagen", unitsSold: 33, revenue: 990000, margin: 12.3, percentage: 20.9 }
    ],
    turnoverRate: 8.5,
    teamPerformance: [
      {
        id: "tm1",
        name: "Pieter Jansen",
        leadsAssigned: 25,
        leadsConverted: 18,
        revenue: 450000,
        responseTime: 2.5
      }
    ],
    financial: {
      totalRevenue: 6420000,
      totalCosts: 4850000,
      grossProfit: 1570000,
      netProfit: 720000,
      grossMargin: 24.5,
      netMargin: 11.2,
      operatingExpenses: 850000,
      ebitda: 840000,
      cashFlow: 900000,
      profitGrowth: 12.5
    },
    revenue: 125000,
    profit: 25000,
    vehiclesSold: 8,
    averageSalePrice: 15625,
    revenueGrowth: 12.5,
    profitMargin: 20,
    revenueChart: [
      { month: "Jan", revenue: 95000, profit: 19000 },
      { month: "Feb", revenue: 110000, profit: 22000 },
      { month: "Mar", revenue: 125000, profit: 25000 },
    ],
    salesChart: [
      { category: "Deze maand", b2c: 5, b2b: 3 },
      { category: "Vorige maand", b2c: 4, b2b: 4 },
    ],
    topVehicles: [
      { model: "X5", brand: "BMW", sales: 2, revenue: 90000 },
      { model: "E-Class", brand: "Mercedes", sales: 3, revenue: 135000 },
      { model: "A4", brand: "Audi", sales: 3, revenue: 123000 },
    ],
    _metadata: {
      dataSource: "Mock Data",
      lastUpdated: new Date().toISOString(),
      recordCounts: {
        salesInvoices: 8
      }
    }
  };

  // Fetch reports data from system database
  const { 
    data: reportsData = mockReportsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['reports', reportPeriod],
    queryFn: async () => {
      try {
        // Use system data from vehicles table
        return await systemReportsService.getReportsData(reportPeriod);
      } catch (error) {
        console.error('Error fetching system reports data:', error);
        // Fallback to mock data only on error
        return mockReportsData;
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Check Exact Online connection status
  const { data: connectionStatus } = useQuery({
    queryKey: ['exact-online-status'],
    queryFn: async () => {
      try {
        return await enhancedReportsService.getConnectionStatus();
      } catch (error) {
        return { isConnected: false, error: 'Connection failed' };
      }
    },
    refetchInterval: 60000, // Check every minute
    refetchOnMount: true
  });

  // Fetch inventory metrics
  const { data: inventoryMetrics, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-metrics'],
    queryFn: () => systemReportsService.getInventoryMetrics(),
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Real-time updates for vehicles that affect reports
  useEffect(() => {
    console.log('📡 Setting up real-time listeners for reports dashboard...');
    
    const channel = supabase
      .channel('reports-vehicle-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('🔄 Vehicle update detected:', payload);
          
          const newVehicle = payload.new as any;
          const oldVehicle = payload.old as any;
          
          // Check if it's a status change to sold
          const statusChanged = oldVehicle.status !== newVehicle.status;
          const isSoldStatus = ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(newVehicle.status);
          
          // Check if prices changed
          const sellingPriceChanged = oldVehicle.selling_price !== newVehicle.selling_price;
          const oldPurchasePrice = oldVehicle.details?.purchasePrice;
          const newPurchasePrice = newVehicle.details?.purchasePrice;
          const purchasePriceChanged = oldPurchasePrice !== newPurchasePrice;
          
          // If relevant changes occurred, update the dashboard
          if ((statusChanged && isSoldStatus) || sellingPriceChanged || purchasePriceChanged) {
            console.log('💰 Important financial change detected:', {
              vehicle: `${newVehicle.brand} ${newVehicle.model}`,
              statusChanged,
              newStatus: newVehicle.status,
              sellingPriceChanged,
              oldSellingPrice: oldVehicle.selling_price,
              newSellingPrice: newVehicle.selling_price,
              purchasePriceChanged,
              oldPurchasePrice,
              newPurchasePrice
            });
            
            // Show toast notification
            if (statusChanged && isSoldStatus) {
              toast.success(
                `Verkoop geregistreerd: ${newVehicle.brand} ${newVehicle.model}`,
                {
                  description: `Status: ${newVehicle.status} • Verkoopprijs: €${newVehicle.selling_price?.toLocaleString() || 0}`
                }
              );
            } else if (sellingPriceChanged) {
              toast.info(
                `Verkoopprijs aangepast: ${newVehicle.brand} ${newVehicle.model}`,
                {
                  description: `Van €${oldVehicle.selling_price?.toLocaleString() || 0} naar €${newVehicle.selling_price?.toLocaleString() || 0}`
                }
              );
            } else if (purchasePriceChanged) {
              toast.info(
                `Inkoopprijs aangepast: ${newVehicle.brand} ${newVehicle.model}`,
                {
                  description: `Van €${oldPurchasePrice?.toLocaleString() || 0} naar €${newPurchasePrice?.toLocaleString() || 0}`
                }
              );
            }
            
            // Invalidate all report queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-metrics'] });
            console.log('✅ Reports data refreshed');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          const newVehicle = payload.new as any;
          const isSoldStatus = ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(newVehicle.status);
          
          if (isSoldStatus) {
            console.log('🆕 New sold vehicle added:', newVehicle);
            toast.success(
              `Nieuw verkocht voertuig: ${newVehicle.brand} ${newVehicle.model}`,
              {
                description: `Status: ${newVehicle.status}`
              }
            );
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-metrics'] });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time listeners...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleDataSourceChange = (useMock: boolean) => {
    setIsUsingMockData(useMock);
    refetch(); // Refresh data when source changes
  };

  const handleExportData = () => {
    if (!reportsData) return;
    
    const csvData = [
      ['Metric', 'Value', 'Period'],
      ['Revenue', (reportsData.revenue || 0).toString(), reportPeriod.label],
      ['Profit', (reportsData.profit || 0).toString(), reportPeriod.label],
      ['Vehicles Sold', (reportsData.vehiclesSold || 0).toString(), reportPeriod.label],
      ['Average Sale Price', (reportsData.averageSalePrice || 0).toString(), reportPeriod.label]
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${reportPeriod.label.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 animate-pulse" />
            <span>Loading reports data...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Rapportages"
          description="Uitgebreide analyses en prestatie-indicatoren"
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportData} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currentWeek">Huidige week</SelectItem>
                <SelectItem value="currentMonth">Huidige maand</SelectItem>
                <SelectItem value="currentYear">Huidig jaar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PageHeader>

        {/* Exact Online Integration Status */}
        <ExactOnlineStatus />

        {/* Data Source Indicator */}
        <DataSourceIndicator 
          isUsingMockData={isUsingMockData || !connectionStatus?.isConnected}
          onDataSourceChange={handleDataSourceChange}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="sales">Verkoop</TabsTrigger>
            <TabsTrigger value="purchase">Inkoop</TabsTrigger>
            <TabsTrigger value="suppliers">Leveranciers</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="financial">Financieel</TabsTrigger>
            <TabsTrigger value="inventory">Voorraad</TabsTrigger>
            <TabsTrigger value="warranty">Garantie</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Totale Omzet</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{(reportsData.revenue || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    {reportsData.revenueGrowth || 0}% vs vorige periode
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Winst</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    €{(reportsData.profit || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    {reportsData.profitMargin || 0}% winstmarge
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verkochte Voertuigen</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportsData.vehiclesSold || 0}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    {reportPeriod.label}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gem. Verkoopprijs</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{(reportsData.averageSalePrice || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                    Per voertuig
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Omzet Ontwikkeling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueChart data={reportsData.revenueChart || []} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Verkoop Statistieken
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesChart data={reportsData.salesChart || []} />
                </CardContent>
              </Card>
            </div>

            {/* Top Vehicles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Topverkopende Voertuigen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TopVehiclesChart data={reportsData.topVehicles || []} />
              </CardContent>
            </Card>

            {/* Data Source Information */}
            {reportsData._metadata && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-blue-800 font-medium">
                        <Database className="h-4 w-4" />
                        Data Source Active
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        Data source: {reportsData._metadata.dataSource} • 
                        Last updated: {new Date(reportsData._metadata.lastUpdated).toLocaleString('nl-NL')}
                      </p>
                    </div>
                    <Badge className="bg-blue-500 text-white">
                      {reportsData._metadata.recordCounts?.salesInvoices || 0} records processed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <SalesAnalytics />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <SalespersonPerformance />
          </TabsContent>
          
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Content</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is the financial content.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="inventory" className="space-y-6">
            {inventoryLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Database className="h-6 w-6 animate-pulse mr-2" />
                <span>Loading inventory data...</span>
              </div>
            ) : (
              <>
                {/* Inventory KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Voertuigen in Voorraad</CardTitle>
                      <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {inventoryMetrics?.totalVehicles || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Voorraad: {inventoryMetrics?.stockByStatus.voorraad || 0} • 
                        Onderweg: {inventoryMetrics?.stockByStatus.onderweg || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Gem. Sta-dagen</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {inventoryMetrics?.avgDaysInStock || 0} dagen
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Tijd tot verkoop
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Gem. Voorraadprijs</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        €{(inventoryMetrics?.avgPrice || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Gemiddelde verkoopprijs
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Totale Voorraadwaarde</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        €{(inventoryMetrics?.totalInventoryValue || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Totale inkoopwaarde
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transport Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Transport Statistieken
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Gem. Doorlooptijd Transport</span>
                        <span className="text-2xl font-bold mt-1">
                          {inventoryMetrics?.avgTransportDays || 0} dagen
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Voertuigen Onderweg</span>
                        <span className="text-2xl font-bold mt-1">
                          {inventoryMetrics?.inTransportCount || 0}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">In Bestelling</span>
                        <span className="text-2xl font-bold mt-1">
                          {inventoryMetrics?.stockByStatus.in_bestelling || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Source Info */}
                {inventoryMetrics?._metadata && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-blue-800 font-medium">
                            <Database className="h-4 w-4" />
                            Voorraad Data Actief
                          </div>
                          <p className="text-sm text-blue-600 mt-1">
                            Data bron: {inventoryMetrics._metadata.dataSource} • 
                            Laatste update: {new Date(inventoryMetrics._metadata.lastUpdated).toLocaleString('nl-NL')}
                          </p>
                        </div>
                        <Badge className="bg-blue-500 text-white">
                          {inventoryMetrics._metadata.recordCounts.stockVehicles} voertuigen verwerkt
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="purchase" className="space-y-6">
            <PurchaseAnalytics period={reportPeriod} />
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6">
            <SupplierAnalytics period={reportPeriod} />
          </TabsContent>

          <TabsContent value="warranty" className="space-y-6">
            <WarrantyReports />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
