
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download,
  Calendar,
  TrendingUp,
  Euro,
  Target,
  Clock,
  Users,
  Phone,
  Car,
  BarChart3,
  PieChart,
  Brain,
  Activity,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { getReportsData, getAvailablePeriods, exportReportData } from "@/services/reportsService";
import { ReportPeriod } from "@/types/reports";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(getAvailablePeriods()[1]);
  const [reportData, setReportData] = useState(getReportsData(getAvailablePeriods()[1]));
  const { toast } = useToast();

  const handlePeriodChange = (periodLabel: string) => {
    const period = getAvailablePeriods().find(p => p.label === periodLabel);
    if (period) {
      setSelectedPeriod(period);
      setReportData(getReportsData(period));
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    try {
      const fileName = await exportReportData(reportData, format);
      toast({
        title: "Export Gestart",
        description: `Performance rapport wordt geëxporteerd als ${format.toUpperCase()}: ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Export Fout",
        description: "Er ging iets mis bij het exporteren van het rapport",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Sales trend data
  const salesTrends = [
    { maand: "Jan", verkopen: 42, omzet: 1680000, leads: 85 },
    { maand: "Feb", verkopen: 38, omzet: 1520000, leads: 78 },
    { maand: "Mar", verkopen: 45, omzet: 1800000, leads: 92 },
    { maand: "Apr", verkopen: 52, omzet: 2080000, leads: 108 },
    { maand: "Mei", verkopen: 48, omzet: 1920000, leads: 95 },
    { maand: "Jun", verkopen: 55, omzet: 2200000, leads: 112 },
  ];

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  const chartConfig = {
    verkopen: { label: "Verkopen", color: "#10B981" },
    omzet: { label: "Omzet", color: "#3B82F6" },
    leads: { label: "Leads", color: "#8B5CF6" },
  };

  return (
    <DashboardLayout>
      {/* Unique Sales Performance Header */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-800 text-white p-8 rounded-xl mb-8 shadow-2xl">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <BarChart3 className="h-10 w-10 text-emerald-300" />
              </div>
              <div>
                <h1 className="text-5xl font-bold">Sales Performance Centre</h1>
                <p className="text-emerald-200 text-xl mt-2">
                  Gedetailleerde verkoop analyse & lead tracking met AI insights
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200 border-emerald-400 px-4 py-2">
                <Calendar className="w-4 h-4 mr-2" />
                {selectedPeriod.label}
              </Badge>
              <Badge variant="secondary" className="bg-teal-500/20 text-teal-200 border-teal-400 px-4 py-2">
                <Activity className="w-4 h-4 mr-2" />
                Live Analytics
              </Badge>
              <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-200 border-cyan-400 px-4 py-2">
                <Brain className="w-4 h-4 mr-2" />
                AI Powered
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-56 bg-white/10 border-white/20 text-white">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailablePeriods().map((period) => (
                  <SelectItem key={period.label} value={period.label}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleExport('excel')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Excel Export
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleExport('pdf')}
                className="bg-teal-600 hover:bg-teal-700 text-white border-0"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Metrics - Different from Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Totale Sales Omzet</CardTitle>
              <Euro className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{formatCurrency(reportData.sales.totalRevenue)}</div>
            <p className="text-sm text-gray-500 mt-1">{reportData.sales.totalUnits} voertuigen verkocht</p>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full mt-2 inline-block">
              +12.5% vs vorige periode
            </span>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-blue-500 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Lead Conversie Ratio</CardTitle>
              <Target className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{formatPercentage(reportData.leads.conversionRate)}</div>
            <p className="text-sm text-gray-500 mt-1">Van {reportData.leads.totalLeads} inkomende leads</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full mt-2 inline-block">
              +8.3% verbetering
            </span>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-orange-500 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Gemiddelde Reactietijd</CardTitle>
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">{reportData.leads.responseTime}u</div>
            <p className="text-sm text-gray-500 mt-1">Eerste contact met lead</p>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full mt-2 inline-block">
              -1.2u sneller
            </span>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Team Follow-up Rate</CardTitle>
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{formatPercentage(reportData.leads.followUpRate)}</div>
            <p className="text-sm text-gray-500 mt-1">Actieve lead opvolging</p>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full mt-2 inline-block">
              +5.7% beter
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Sales Analytics Charts - Unique to Reports */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Sales & Lead Trends (6 Maanden)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="maand" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="verkopen" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    name="Verkopen"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    name="Leads"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              Verkoop per Merk Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={reportData.vehicleTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="unitsSold"
                  >
                    {reportData.vehicleTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel - Unique Feature */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Lead Source & Conversion Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">AutoTrader</div>
                  <div className="text-sm text-gray-600 mt-1">38% conversie</div>
                  <div className="text-xs text-green-500 mt-1">Beste performance</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">Marktplaats</div>
                  <div className="text-sm text-gray-600 mt-1">31% conversie</div>
                  <div className="text-xs text-blue-500 mt-1">Stabiele bron</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">Website</div>
                  <div className="text-sm text-gray-600 mt-1">45% conversie</div>
                  <div className="text-xs text-orange-500 mt-1">Hoogste kwaliteit</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-lg border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Business Insights
                <Badge className="bg-purple-100 text-purple-700 ml-2">LIVE</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-emerald-50">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-emerald-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-sm text-emerald-800">Optimalisatie Kans</h4>
                      <p className="text-xs text-emerald-700 mt-1">BMW toont 15.2% marge. Verhoog marketing budget met 20%</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-sm text-orange-800">Aandachtspunt</h4>
                      <p className="text-xs text-orange-700 mt-1">23% leads krijgt geen follow-up binnen 48u</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-4 w-4 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-sm text-blue-800">Suggestie</h4>
                      <p className="text-xs text-blue-700 mt-1">Reactietijd kan worden verbeterd naar 1.5u voor +15% conversie</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vehicle Performance Analysis */}
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-gray-600" />
            Voertuig Performance per Merk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.vehicleTypes.map((vehicle, index) => (
              <div key={vehicle.type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <div className="font-semibold text-lg">{vehicle.type}</div>
                    <div className="text-sm text-gray-500">{vehicle.unitsSold} verkocht | {vehicle.percentage.toFixed(1)}% van totaal</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{formatCurrency(vehicle.revenue)}</div>
                  <div className="text-sm text-gray-500">{formatPercentage(vehicle.margin)} marge</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Reports;
