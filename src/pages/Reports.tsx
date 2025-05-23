
import React, { useState } from "react";
import ReportsLayout from "@/components/layout/ReportsLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp,
  Euro,
  Target,
  Users,
  Phone,
  Activity,
  AlertTriangle,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Zap,
  Star,
  Brain,
  Calendar,
  Download,
  RefreshCw,
  BarChart,
  PieChart as PieChartIcon
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from "recharts";
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
        description: `Analytics rapport wordt geëxporteerd als ${format.toUpperCase()}: ${fileName}`,
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

  // Chart configurations
  const salesChartConfig = {
    omzet: {
      label: "Omzet (€)",
      color: "#8B5CF6",
    },
  };

  const teamChartConfig = {
    deals: {
      label: "Gesloten Deals",
      color: "#8B5CF6",
    },
  };

  const productChartConfig = {
    waarde: {
      label: "Percentage",
      color: "#8B5CF6",
    },
  };

  // Unieke analytics data voor reports
  const salesTrendData = [
    { maand: "Jan", omzet: 1200000, deals: 45, margin: 12.5 },
    { maand: "Feb", omzet: 1450000, deals: 52, margin: 14.2 },
    { maand: "Mar", omzet: 1680000, deals: 48, margin: 15.8 },
    { maand: "Apr", omzet: 1890000, deals: 61, margin: 16.3 },
    { maand: "Mei", omzet: 2100000, deals: 58, margin: 17.1 },
    { maand: "Jun", omzet: 1950000, deals: 55, margin: 16.8 },
  ];

  const teamPerformanceData = [
    { naam: "Lisa v.d. Berg", deals: 28, omzet: 890000, score: 94 },
    { naam: "Pieter Jansen", deals: 25, omzet: 750000, score: 87 },
    { naam: "Sander Vermeulen", deals: 22, omzet: 680000, score: 82 },
    { naam: "Emma de Vries", deals: 30, omzet: 920000, score: 96 },
  ];

  const productMixData = [
    { categorie: "Premium SUV", waarde: 45, kleur: "#8B5CF6", omzet: 2800000 },
    { categorie: "Luxury Sedan", waarde: 28, kleur: "#10B981", omzet: 1900000 },
    { categorie: "Sport Coupe", waarde: 18, kleur: "#F59E0B", omzet: 1200000 },
    { categorie: "Hybride", waarde: 9, kleur: "#EF4444", omzet: 600000 },
  ];

  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <ReportsLayout>
      {/* Nederlandse Analytics Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 rounded-xl p-8 mb-8 text-white shadow-2xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-3 flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur">
                <BarChart className="h-10 w-10" />
              </div>
              Verkoop Prestatie Analytics
            </h1>
            <p className="text-xl text-purple-200 mb-4">
              Diepgaande business intelligence & verkoop analyse voor {selectedPeriod.label.toLowerCase()}
            </p>
            <div className="flex gap-3">
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400">Live Data</Badge>
              <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400">Real-time Updates</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-56 bg-white/10 text-white border-white/20">
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
              <Button onClick={() => handleExport('excel')} size="sm" className="bg-green-600 hover:bg-green-700">
                <Download className="w-3 h-3 mr-1" />
                Excel
              </Button>
              <Button onClick={() => handleExport('pdf')} size="sm" className="bg-red-600 hover:bg-red-700">
                <Download className="w-3 h-3 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Executive KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-xl transform hover:scale-105 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Euro className="h-10 w-10 text-emerald-200" />
              <div className="text-right">
                <div className="text-xs text-emerald-200">YTD Groei</div>
                <Badge className="bg-white/20 text-white">+18.5%</Badge>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{formatCurrency(reportData.sales.totalRevenue)}</h3>
            <p className="text-emerald-200">Totale Verkoop Omzet</p>
            <div className="mt-2 flex items-center text-xs">
              <ArrowUp className="w-3 h-3 mr-1" />
              <span>Stijgende trend vs. vorige periode</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl transform hover:scale-105 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="h-10 w-10 text-blue-200" />
              <div className="text-right">
                <div className="text-xs text-blue-200">Doel</div>
                <Badge className="bg-white/20 text-white">125%</Badge>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{formatPercentage(reportData.leads.conversionRate)}</h3>
            <p className="text-blue-200">Lead Conversie Ratio</p>
            <div className="mt-2 flex items-center text-xs">
              <Zap className="w-3 h-3 mr-1" />
              <span>Boven industriegemiddelde</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl transform hover:scale-105 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-10 w-10 text-purple-200" />
              <div className="text-right">
                <div className="text-xs text-purple-200">Actief</div>
                <Badge className="bg-white/20 text-white">{reportData.leads.totalLeads}</Badge>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{formatPercentage(reportData.leads.followUpRate)}</h3>
            <p className="text-purple-200">Team Opvolg Ratio</p>
            <div className="mt-2 flex items-center text-xs">
              <Star className="w-3 h-3 mr-1" />
              <span>Uitstekende prestatie</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-xl transform hover:scale-105 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Phone className="h-10 w-10 text-orange-200" />
              <div className="text-right">
                <div className="text-xs text-orange-200">SLA</div>
                <Badge className="bg-white/20 text-white">2u</Badge>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{reportData.leads.responseTime}u</h3>
            <p className="text-orange-200">Gemiddelde Reactietijd</p>
            <div className="mt-2 flex items-center text-xs">
              <Activity className="w-3 h-3 mr-1" />
              <span>Binnen doelbereik</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        {/* Sales Trend Analysis */}
        <div className="xl:col-span-2">
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-gray-800 to-slate-800 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <TrendingUp className="h-6 w-6" />
                Verkoop Prestatie Trends & Marge Analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[400px]">
                <ChartContainer config={salesChartConfig}>
                  <AreaChart data={salesTrendData}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="maand" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="omzet" 
                      stroke="#8B5CF6" 
                      fill="url(#salesGradient)"
                      strokeWidth={3}
                      name="Omzet (€)"
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(1950000)}</div>
                  <div className="text-sm text-gray-600">Gemiddelde Maand</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">+15.2%</div>
                  <div className="text-sm text-gray-600">Groei JoJ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">16.1%</div>
                  <div className="text-sm text-gray-600">Gem. Marge</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Business Intelligence Panel */}
        <div>
          <Card className="shadow-2xl border-0 bg-white h-fit">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Brain className="h-6 w-6" />
                AI Business Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                <div className="flex items-start gap-3">
                  <Zap className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-green-800 mb-2">Omzet Kans Gedetecteerd</h4>
                    <p className="text-sm text-green-700 leading-relaxed">
                      Premium segment toont 22% groeipotentieel. Focus marketingbudget op luxe SUV voorraad voor Q4.
                    </p>
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      Potentiële Impact: +€450K omzet
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-l-4 border-orange-500">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-orange-800 mb-2">Prestatie Waarschuwing</h4>
                    <p className="text-sm text-orange-700 leading-relaxed">
                      Lead reactietijd gestegen met 18% vs. vorige maand. Overweeg geautomatiseerde opvolg workflows.
                    </p>
                    <div className="mt-2 text-xs text-orange-600 font-medium">
                      Actie Vereist: Proces Optimalisatie
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-blue-800 mb-2">Strategische Aanbeveling</h4>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      Implementeer dynamisch prijsmodel gebaseerd op voorraad omloopsnelheid. Verwachte efficiëntiewinst: +30%.
                    </p>
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      Implementatie Complexiteit: Gemiddeld
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Performance Leaderboard */}
        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Star className="h-6 w-6" />
              Team Prestatie Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[320px]">
              <ChartContainer config={teamChartConfig}>
                <RechartsBarChart data={teamPerformanceData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="naam" type="category" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="deals" fill="#8B5CF6" name="Gesloten Deals" />
                </RechartsBarChart>
              </ChartContainer>
            </div>
            <div className="mt-4 space-y-3">
              {teamPerformanceData.map((member, index) => (
                <div key={member.naam} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{member.naam}</div>
                      <div className="text-sm text-gray-600">{formatCurrency(member.omzet)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-600">{member.score}%</div>
                    <div className="text-xs text-gray-500">Prestatie Score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Mix Analysis */}
        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <PieChartIcon className="h-6 w-6" />
              Product Portfolio Analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] mb-4">
              <ChartContainer config={productChartConfig}>
                <RechartsPieChart>
                  <Pie
                    data={productMixData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="waarde"
                  >
                    {productMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 shadow-lg rounded-lg border">
                            <p className="font-medium">{data.categorie}</p>
                            <p className="text-sm text-gray-600">Aandeel: {data.waarde}%</p>
                            <p className="text-sm text-gray-600">Omzet: {formatCurrency(data.omzet)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RechartsPieChart>
              </ChartContainer>
            </div>
            <div className="space-y-3">
              {productMixData.map((product, index) => (
                <div key={product.categorie} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{product.categorie}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{product.waarde}%</div>
                    <div className="text-xs text-gray-600">{formatCurrency(product.omzet)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportsLayout>
  );
};

export default Reports;
