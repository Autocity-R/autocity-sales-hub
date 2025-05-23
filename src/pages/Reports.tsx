import React, { useState } from "react";
import ReportsLayout from "@/components/layout/ReportsLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  PieChart as PieChartIcon,
  Car,
  Clock,
  ShoppingCart,
  Award,
  Calculator,
  CreditCard,
  Shield
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from "recharts";
import { getReportsData, getAvailablePeriods, exportReportData } from "@/services/reportsService";
import { ReportPeriod } from "@/types/reports";
import { useToast } from "@/hooks/use-toast";
import { FinancialAnalytics } from "@/components/reports/FinancialAnalytics";
import { FinancialAgent } from "@/components/reports/FinancialAgent";

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
        description: `Financieel rapport wordt geëxporteerd als ${format.toUpperCase()}: ${fileName}`,
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

  const vehiclesSoldData = [
    { maand: "Jan", verkocht: 42, omzet: 1680000, gemGemBedrag: 40000 },
    { maand: "Feb", verkocht: 38, omzet: 1520000, gemGemBedrag: 40000 },
    { maand: "Mar", verkocht: 45, omzet: 1800000, gemGemBedrag: 40000 },
    { maand: "Apr", verkocht: 52, omzet: 2080000, gemGemBedrag: 40000 },
    { maand: "Mei", verkocht: 48, omzet: 1920000, gemGemBedrag: 40000 },
    { maand: "Jun", verkocht: 55, omzet: 2200000, gemGemBedrag: 40000 },
  ];

  const fastestSellingModels = [
    { model: "BMW 3 Serie", gemStadagen: 12, verkocht: 28, marktaandeel: 18.7 },
    { model: "Mercedes C-Klasse", gemStadagen: 15, verkocht: 25, marktaandeel: 16.7 },
    { model: "Audi A4", gemStadagen: 18, verkocht: 22, marktaandeel: 14.7 },
    { model: "VW Golf", gemStadagen: 22, verkocht: 20, marktaandeel: 13.3 },
    { model: "BMW X3", gemStadagen: 25, verkocht: 18, marktaandeel: 12.0 },
  ];

  const inventoryTurnover = [
    { categorie: "Premium SUV", voorraad: 45, verkocht: 38, omloopsnelheid: 84.4, stadagen: 14 },
    { categorie: "Luxe Sedan", voorraad: 32, verkocht: 28, omloopsnelheid: 87.5, stadagen: 12 },
    { categorie: "Sport Coupe", voorraad: 28, verkocht: 22, omloopsnelheid: 78.6, stadagen: 18 },
    { categorie: "Hybride", voorraad: 15, verkocht: 12, omloopsnelheid: 80.0, stadagen: 16 },
  ];

  const periodicSalesComparison = [
    { periode: "Q1 2024", verkocht: 125, groei: 12.5, topModel: "BMW 3 Serie" },
    { periode: "Q2 2024", verkocht: 155, groei: 24.0, topModel: "Mercedes C-Klasse" },
    { periode: "Q3 2024", verkocht: 142, groei: 13.6, topModel: "Audi A4" },
    { periode: "Q4 2023", verkocht: 110, groei: -8.3, topModel: "VW Golf" },
  ];

  const brandPerformance = [
    { merk: "BMW", verkocht: 89, omzet: 3560000, marge: 16.2, kleur: "#1f77b4" },
    { merk: "Mercedes", verkocht: 76, omzet: 3800000, marge: 18.5, kleur: "#ff7f0e" },
    { merk: "Audi", verkocht: 68, omzet: 2720000, marge: 15.8, kleur: "#2ca02c" },
    { merk: "Volkswagen", verkocht: 52, omzet: 1560000, marge: 12.3, kleur: "#d62728" },
  ];

  const chartConfigs = {
    salesTrend: {
      verkocht: { label: "Verkochte Auto's", color: "#8B5CF6" },
      omzet: { label: "Omzet (€)", color: "#10B981" },
    },
    brandPerformance: {
      verkocht: { label: "Verkochte Eenheden", color: "#8B5CF6" },
    },
    inventory: {
      omloopsnelheid: { label: "Omloopsnelheid (%)", color: "#3B82F6" },
    },
  };

  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  return (
    <ReportsLayout>
      {/* Financial Agent Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 rounded-xl p-8 mb-8 text-white shadow-2xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-3 flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur">
                <Calculator className="h-10 w-10" />
              </div>
              Financial Agent Portaal
              <Badge className="bg-red-500/20 text-red-200 border-red-400">
                <Shield className="w-4 h-4 mr-1" />
                ADMIN ONLY
              </Badge>
            </h1>
            <p className="text-xl text-purple-200 mb-4">
              Complete financiële analyse en AI-gestuurde business intelligence voor {selectedPeriod.label.toLowerCase()}
            </p>
            <div className="flex gap-3">
              <Badge className="bg-green-500/20 text-green-200 border-green-400">Live Financiële Data</Badge>
              <Badge className="bg-blue-500/20 text-blue-200 border-blue-400">AI Financial Agent</Badge>
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400">Real-time Analytics</Badge>
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

      {/* Main Tabs for Different Analytics Views */}
      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <Euro className="w-4 h-4" />
            Financiële Analytics
          </TabsTrigger>
          <TabsTrigger value="automotive" className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            Automotive Analytics
          </TabsTrigger>
          <TabsTrigger value="agent" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Financial Agent
          </TabsTrigger>
        </TabsList>

        {/* Financial Analytics Tab */}
        <TabsContent value="financial" className="space-y-6">
          <FinancialAnalytics financial={reportData.financial} />
        </TabsContent>

        {/* Automotive Analytics Tab */}
        <TabsContent value="automotive" className="space-y-6">
          
          {/* Automotive KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl transform hover:scale-105 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Car className="h-10 w-10 text-blue-200" />
                  <div className="text-right">
                    <div className="text-xs text-blue-200">Deze Maand</div>
                    <Badge className="bg-white/20 text-white">+18.5%</Badge>
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-1">155</h3>
                <p className="text-blue-200">Verkochte Voertuigen</p>
                <div className="mt-2 flex items-center text-xs">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  <span>Stijging vs. vorige maand</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl transform hover:scale-105 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="h-10 w-10 text-green-200" />
                  <div className="text-right">
                    <div className="text-xs text-green-200">Gemiddeld</div>
                    <Badge className="bg-white/20 text-white">Uitstekend</Badge>
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-1">16</h3>
                <p className="text-green-200">Gemiddelde Stadagen</p>
                <div className="mt-2 flex items-center text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  <span>Snelle omloopsnelheid</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl transform hover:scale-105 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Award className="h-10 w-10 text-purple-200" />
                  <div className="text-right">
                    <div className="text-xs text-purple-200">Top Model</div>
                    <Badge className="bg-white/20 text-white">BMW</Badge>
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-1">28</h3>
                <p className="text-purple-200">BMW 3 Serie Verkocht</p>
                <div className="mt-2 flex items-center text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  <span>Bestverkopend model</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-xl transform hover:scale-105 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <ShoppingCart className="h-10 w-10 text-orange-200" />
                  <div className="text-right">
                    <div className="text-xs text-orange-200">Voorraad</div>
                    <Badge className="bg-white/20 text-white">120</Badge>
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-1">85%</h3>
                <p className="text-orange-200">Voorraad Omloopsnelheid</p>
                <div className="mt-2 flex items-center text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  <span>Gezonde voorraadrotatie</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hoofdanalyse Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Verkopen Trend Analyse */}
            <div className="xl:col-span-2">
              <Card className="shadow-2xl border-0 bg-white">
                <CardHeader className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <TrendingUp className="h-6 w-6" />
                    Maandelijkse Verkoop Prestaties & Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[400px]">
                    <ChartContainer config={chartConfigs.salesTrend}>
                      <AreaChart data={vehiclesSoldData}>
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
                          dataKey="verkocht" 
                          stroke="#8B5CF6" 
                          fill="url(#salesGradient)"
                          strokeWidth={3}
                          name="Verkochte Auto's"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">47</div>
                      <div className="text-sm text-gray-600">Gem. per Maand</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">+18.2%</div>
                      <div className="text-sm text-gray-600">Groei dit Jaar</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(40000)}</div>
                      <div className="text-sm text-gray-600">Gem. Verkoopprijs</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Automotive AI Insights */}
            <div>
              <Card className="shadow-2xl border-0 bg-white h-fit">
                <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <Brain className="h-6 w-6" />
                    Automotive AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                    <div className="flex items-start gap-3">
                      <Zap className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-green-800 mb-2">Voorraad Optimalisatie</h4>
                        <p className="text-sm text-green-700 leading-relaxed">
                          BMW 3 Serie heeft slechts 12 stadagen gemiddeld. Verhoog voorraad van dit model met 25% voor optimale verkoop.
                        </p>
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          Potentiële Omzet Verhoging: +€320K
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-l-4 border-orange-500">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-orange-800 mb-2">Langzame Rotatie Waarschuwing</h4>
                        <p className="text-sm text-orange-700 leading-relaxed">
                          BMW X3 heeft 25 stadagen gemiddeld. Overweeg prijsaanpassing of marketingcampagne voor snellere verkoop.
                        </p>
                        <div className="mt-2 text-xs text-orange-600 font-medium">
                          Actie Vereist: Prijsstrategie Review
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-blue-800 mb-2">Seizoenspatroon Detectie</h4>
                        <p className="text-sm text-blue-700 leading-relaxed">
                          Q2 toont 24% groei. Plan voorraad inkoop voor Q2 2025 gebaseerd op dit seizoenspatroon.
                        </p>
                        <div className="mt-2 text-xs text-blue-600 font-medium">
                          Planning Aanbeveling: Verhoog Q2 Inkoop
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Snelst Verkopende Modellen & Merk Prestaties */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Snelst Verkopende Modellen */}
            <Card className="shadow-2xl border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3">
                  <Star className="h-6 w-6" />
                  Snelst Verkopende Modellen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {fastestSellingModels.map((model, index) => (
                    <div key={model.model} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg border-l-4 border-purple-500">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{model.model}</div>
                          <div className="text-sm text-gray-600">{model.verkocht} verkocht • {model.marktaandeel}% marktaandeel</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{model.gemStadagen}</div>
                        <div className="text-xs text-gray-500">Gemiddelde Stadagen</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Merk Prestatie Analyse */}
            <Card className="shadow-2xl border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3">
                  <Award className="h-6 w-6" />
                  Merk Prestatie Analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] mb-4">
                  <ChartContainer config={chartConfigs.brandPerformance}>
                    <RechartsPieChart>
                      <Pie
                        data={brandPerformance}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="verkocht"
                      >
                        {brandPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.kleur} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 shadow-lg rounded-lg border">
                                <p className="font-medium">{data.merk}</p>
                                <p className="text-sm text-gray-600">Verkocht: {data.verkocht} auto's</p>
                                <p className="text-sm text-gray-600">Omzet: {formatCurrency(data.omzet)}</p>
                                <p className="text-sm text-gray-600">Marge: {data.marge}%</p>
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
                  {brandPerformance.map((brand, index) => (
                    <div key={brand.merk} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: brand.kleur }}
                        />
                        <div>
                          <div className="font-medium">{brand.merk}</div>
                          <div className="text-sm text-gray-600">{brand.verkocht} voertuigen</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(brand.omzet)}</div>
                        <div className="text-xs text-gray-600">Marge: {brand.marge}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Voorraad Rotatie & Periode Vergelijking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Voorraad Rotatie Analyse */}
            <Card className="shadow-2xl border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3">
                  <Activity className="h-6 w-6" />
                  Voorraad Rotatie Analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {inventoryTurnover.map((item, index) => (
                    <div key={item.categorie} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-gray-800">{item.categorie}</div>
                        <Badge className={`${
                          item.omloopsnelheid > 85 ? 'bg-green-500' : 
                          item.omloopsnelheid > 75 ? 'bg-yellow-500' : 'bg-red-500'
                        } text-white`}>
                          {item.omloopsnelheid.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Voorraad</div>
                          <div className="font-medium">{item.voorraad}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Verkocht</div>
                          <div className="font-medium">{item.verkocht}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Stadagen</div>
                          <div className="font-medium">{item.stadagen} dagen</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Periode Vergelijking */}
            <Card className="shadow-2xl border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3">
                  <Calendar className="h-6 w-6" />
                  Kwartaal Prestatie Vergelijking
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {periodicSalesComparison.map((period, index) => (
                    <div key={period.periode} className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-gray-800">{period.periode}</div>
                        <div className="flex items-center gap-2">
                          {period.groei > 0 ? (
                            <ArrowUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-red-600" />
                          )}
                          <Badge className={`${
                            period.groei > 15 ? 'bg-green-500' :
                            period.groei > 5 ? 'bg-yellow-500' : 'bg-red-500'
                          } text-white`}>
                            {period.groei > 0 ? '+' : ''}{period.groei}%
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Verkocht</div>
                          <div className="font-medium text-lg">{period.verkocht} auto's</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Top Model</div>
                          <div className="font-medium">{period.topModel}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Financial Agent Tab */}
        <TabsContent value="agent" className="space-y-6">
          <FinancialAgent reportData={reportData} />
        </TabsContent>
      </Tabs>
    </ReportsLayout>
  );
};

export default Reports;
