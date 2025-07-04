
import React, { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { enhancedReportsService } from "@/services/enhancedReportsService";
import { ReportPeriod, PerformanceData } from "@/types/reports";

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
  
  // Generate report period based on selection
  const reportPeriod: ReportPeriod = React.useMemo(() => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case "lastMonth":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: lastMonth.toISOString(),
          endDate: lastMonthEnd.toISOString(),
          label: "Vorige maand",
          type: "month" as const
        };
      
      case "currentQuarter":
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return {
          startDate: quarterStart.toISOString(),
          endDate: now.toISOString(),
          label: "Huidig kwartaal",
          type: "custom" as const
        };
      
      case "currentYear":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return {
          startDate: yearStart.toISOString(),
          endDate: now.toISOString(),
          label: "Huidig jaar",
          type: "year" as const
        };
      
      default: // currentMonth
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          startDate: monthStart.toISOString(),
          endDate: now.toISOString(),
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

  // Fetch reports data with fallback to mock data
  const { 
    data: reportsData = mockReportsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['reports', reportPeriod],
    queryFn: async () => {
      try {
        return await enhancedReportsService.getReportsData(reportPeriod);
      } catch (error) {
        console.log('Using mock data fallback for reports');
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
                <SelectItem value="currentMonth">Huidige maand</SelectItem>
                <SelectItem value="lastMonth">Vorige maand</SelectItem>
                <SelectItem value="currentQuarter">Huidig kwartaal</SelectItem>
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
            <TabsTrigger value="financial">Financieel</TabsTrigger>
            <TabsTrigger value="inventory">Voorraad</TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle>Sales Content</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is the sales content.</p>
              </CardContent>
            </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Inventory Content</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This is the inventory content.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
