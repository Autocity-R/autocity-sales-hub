
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
  BarChart3,
  PieChart,
  Brain,
  Activity,
  AlertTriangle,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Zap,
  Star
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, Area, AreaChart } from "recharts";
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

  // Sales performance data
  const salesTrends = [
    { periode: "Week 1", verkopen: 12, leads: 28, conversie: 42.9 },
    { periode: "Week 2", verkopen: 15, leads: 32, conversie: 46.9 },
    { periode: "Week 3", verkopen: 18, leads: 35, conversie: 51.4 },
    { periode: "Week 4", verkopen: 22, leads: 40, conversie: 55.0 },
  ];

  const leadSources = [
    { bron: "AutoTrader", leads: 45, conversie: 38, omzet: 1680000 },
    { bron: "Marktplaats", leads: 52, conversie: 31, omzet: 1520000 },
    { bron: "Website", leads: 28, conversie: 45, omzet: 890000 },
    { bron: "Referrals", leads: 18, conversie: 61, omzet: 750000 },
    { bron: "Social Media", leads: 22, conversie: 27, omzet: 420000 },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

  return (
    <DashboardLayout>
      {/* Unique Sales Analytics Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white p-8 rounded-2xl mb-8 shadow-2xl border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-500/20 rounded-2xl border border-blue-400/30">
                <BarChart3 className="h-12 w-12 text-blue-300" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent">
                  Sales Performance Analytics
                </h1>
                <p className="text-blue-200 text-lg mt-2">
                  Gedetailleerde verkoop en lead analyse met AI-gestuurde inzichten
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/50 px-4 py-2">
                <Calendar className="w-4 h-4 mr-2" />
                {selectedPeriod.label}
              </Badge>
              <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/50 px-4 py-2">
                <Activity className="w-4 h-4 mr-2" />
                Real-time Analytics
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/50 px-4 py-2">
                <Brain className="w-4 h-4 mr-2" />
                AI Insights
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 lg:items-end">
            <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full lg:w-56 bg-white/10 border-white/20 text-white backdrop-blur-sm">
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
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleExport('excel')}
                className="bg-green-600/80 hover:bg-green-600 text-white border-0 backdrop-blur-sm"
              >
                <Download className="w-3 h-3 mr-1" />
                Excel
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleExport('pdf')}
                className="bg-red-600/80 hover:bg-red-600 text-white border-0 backdrop-blur-sm"
              >
                <Download className="w-3 h-3 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance KPI Cards - Unique Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Euro className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUp className="w-4 h-4 mr-1" />
                +12.5%
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-green-700">{formatCurrency(reportData.sales.totalRevenue)}</h3>
              <p className="text-sm text-green-600 font-medium">Totale Sales Omzet</p>
              <p className="text-xs text-green-500">{reportData.sales.totalUnits} voertuigen</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <ArrowUp className="w-4 h-4 mr-1" />
                +8.3%
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-blue-700">{formatPercentage(reportData.leads.conversionRate)}</h3>
              <p className="text-sm text-blue-600 font-medium">Lead Conversie</p>
              <p className="text-xs text-blue-500">{reportData.leads.totalLeads} leads actief</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex items-center text-green-600 text-sm font-medium">
                <ArrowDown className="w-4 h-4 mr-1" />
                -1.2u
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-orange-700">{reportData.leads.responseTime}u</h3>
              <p className="text-sm text-orange-600 font-medium">Reactietijd</p>
              <p className="text-xs text-orange-500">Eerste contact</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Phone className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex items-center text-purple-600 text-sm font-medium">
                <ArrowUp className="w-4 h-4 mr-1" />
                +5.7%
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-purple-700">{formatPercentage(reportData.leads.followUpRate)}</h3>
              <p className="text-sm text-purple-600 font-medium">Follow-up Ratio</p>
              <p className="text-xs text-purple-500">Team gemiddelde</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex items-center text-indigo-600 text-sm font-medium">
                <ArrowUp className="w-4 h-4 mr-1" />
                +15.2%
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-indigo-700">{formatPercentage(reportData.sales.averageMargin)}</h3>
              <p className="text-sm text-indigo-600 font-medium">Avg. Marge</p>
              <p className="text-xs text-indigo-500">Per verkoop</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-teal-500/10 rounded-xl">
                <Activity className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex items-center text-green-600 text-sm font-medium">
                <ArrowDown className="w-4 h-4 mr-1" />
                -2d
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-teal-700">{reportData.turnoverRate}d</h3>
              <p className="text-sm text-teal-600 font-medium">Omlooptijd</p>
              <p className="text-xs text-teal-500">Voorraad cyclus</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Performance Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2">
          <Card className="shadow-xl border-0 bg-gradient-to-br from-slate-50 to-blue-50">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <TrendingUp className="h-6 w-6" />
                Sales Performance Trends
                <Badge className="bg-white/20 text-white">Live Data</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrends}>
                    <defs>
                      <linearGradient id="colorVerkopen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="periode" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="verkopen" 
                      stroke="#3B82F6" 
                      fillOpacity={1} 
                      fill="url(#colorVerkopen)"
                      strokeWidth={3}
                      name="Verkopen"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="leads" 
                      stroke="#10B981" 
                      fillOpacity={1} 
                      fill="url(#colorLeads)"
                      strokeWidth={3}
                      name="Leads"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Brain className="h-5 w-5" />
                AI Business Intelligence
                <Badge className="bg-white/20 text-white animate-pulse">LIVE</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-green-800 text-sm">Revenue Opportunity</h4>
                    <p className="text-xs text-green-700 mt-1 leading-relaxed">
                      BMW segment toont 15.2% marge groei. Verhoog marketing budget met €5K voor +20% ROI
                    </p>
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full mt-2 inline-block">
                      Hoge impact
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-orange-800 text-sm">Lead Verlies Alert</h4>
                    <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                      23% leads krijgt geen follow-up binnen 48u. Gemiste omzet: €380K/maand
                    </p>
                    <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full mt-2 inline-block">
                      Actie vereist
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Lightbulb className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-800 text-sm">Process Optimalisatie</h4>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      Reactietijd naar 1.5u verkorten = +15% conversie. Automatiseer lead routing
                    </p>
                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full mt-2 inline-block">
                      Quick win
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-800 text-sm">Top Performer</h4>
                    <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                      Lisa van der Berg: 21/28 conversie (75%). Analyseer strategie voor team training
                    </p>
                    <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full mt-2 inline-block">
                      Best practice
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lead Source Performance Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-gray-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              Lead Bron Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {leadSources.map((source, index) => (
                <div key={source.bron} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl hover:from-gray-100 hover:to-slate-100 transition-all duration-300 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full shadow-lg" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <div className="font-bold text-gray-900">{source.bron}</div>
                      <div className="text-sm text-gray-600">{source.leads} leads • {source.conversie}% conversie</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">{formatCurrency(source.omzet)}</div>
                    <div className="text-sm text-gray-500">Omzet bijdrage</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <PieChart className="h-5 w-5" />
              Verkoop Verdeling per Merk
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={reportData.vehicleTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="unitsSold"
                    label={({ type, percentage }) => `${type}: ${percentage.toFixed(0)}%`}
                  >
                    {reportData.vehicleTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {reportData.vehicleTypes.map((vehicle, index) => (
                <div key={vehicle.type} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="text-sm">
                    <div className="font-medium">{vehicle.type}</div>
                    <div className="text-xs text-gray-500">{vehicle.unitsSold} units</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
