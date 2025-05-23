
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
  Calendar
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
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

  // Analytics data
  const performanceMetrics = [
    { maand: "Jan", omzet: 1200000, leads: 45, conversie: 67.8 },
    { maand: "Feb", omzet: 1450000, leads: 52, conversie: 71.2 },
    { maand: "Mar", omzet: 1680000, leads: 48, conversie: 69.4 },
    { maand: "Apr", omzet: 1890000, leads: 61, conversie: 73.8 },
    { maand: "Mei", omzet: 2100000, leads: 58, conversie: 76.3 },
    { maand: "Jun", omzet: 1950000, leads: 55, conversie: 74.1 },
  ];

  const leadChannels = [
    { kanaal: "Online Marketing", waarde: 35, kleur: "#8B5CF6" },
    { kanaal: "Referrals", waarde: 28, kleur: "#10B981" },
    { kanaal: "Direct Sales", waarde: 22, kleur: "#F59E0B" },
    { kanaal: "Social Media", waarde: 15, kleur: "#EF4444" },
  ];

  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <ReportsLayout>
      {/* Period Selector */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Business Performance Dashboard</h2>
          <p className="text-gray-600">Diepgaande analyse van verkoop, leads en bedrijfsprestaties</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-48 bg-white border-gray-300">
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
        </div>
      </div>

      {/* KPI Cards - Unique Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Euro className="h-8 w-8 text-purple-200" />
              <Badge className="bg-white/20 text-white">+15.2%</Badge>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatCurrency(reportData.sales.totalRevenue)}</h3>
            <p className="text-purple-200">Totale Omzet</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="h-8 w-8 text-green-200" />
              <Badge className="bg-white/20 text-white">+8.7%</Badge>
            </div>
            <h3 className="text-2xl font-bold mb-1">{formatPercentage(reportData.leads.conversionRate)}</h3>
            <p className="text-green-200">Conversie Ratio</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-orange-200" />
              <Badge className="bg-white/20 text-white">+12.3%</Badge>
            </div>
            <h3 className="text-2xl font-bold mb-1">{reportData.leads.totalLeads}</h3>
            <p className="text-orange-200">Actieve Leads</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Phone className="h-8 w-8 text-blue-200" />
              <Badge className="bg-white/20 text-white">-0.8h</Badge>
            </div>
            <h3 className="text-2xl font-bold mb-1">{reportData.leads.responseTime}h</h3>
            <p className="text-blue-200">Reactietijd</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2">
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-gray-800 text-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <TrendingUp className="h-6 w-6" />
                Omzet & Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceMetrics}>
                    <defs>
                      <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
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
                      fillOpacity={1} 
                      fill="url(#colorOmzet)"
                      strokeWidth={3}
                      name="Omzet (€)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <CardTitle className="flex items-center gap-3">
                <Brain className="h-5 w-5" />
                AI Business Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-500">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-bold text-green-800 text-sm">Revenue Opportunity</h4>
                    <p className="text-xs text-green-700 mt-1">
                      Premium segment toont 18% groei potentieel. Focus op high-end modellen.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-l-4 border-orange-500">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-1" />
                  <div>
                    <h4 className="font-bold text-orange-800 text-sm">Performance Alert</h4>
                    <p className="text-xs text-orange-700 mt-1">
                      Lead response tijd 15% gestegen. Optimalisatie nodig.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-bold text-blue-800 text-sm">Smart Suggestion</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Automatiseer follow-up proces voor +25% efficiency boost.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lead Channels Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-slate-700 text-white">
            <CardTitle className="flex items-center gap-3">
              <Activity className="h-5 w-5" />
              Lead Kanaal Verdeling
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={leadChannels}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="waarde"
                    label={({ kanaal, waarde }) => `${kanaal}: ${waarde}%`}
                  >
                    {leadChannels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {leadChannels.map((channel, index) => (
                <div key={channel.kanaal} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{channel.kanaal}</span>
                  </div>
                  <span className="text-sm text-gray-600">{channel.waarde}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="flex items-center gap-3">
              <Star className="h-5 w-5" />
              Top Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <div>
                  <h4 className="font-bold text-purple-900">Best Performing Month</h4>
                  <p className="text-sm text-purple-700">Mei 2024</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-900">{formatCurrency(2100000)}</div>
                  <div className="text-sm text-purple-600">+76.3% conversie</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div>
                  <h4 className="font-bold text-green-900">Highest Conversion</h4>
                  <p className="text-sm text-green-700">Premium Segment</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-900">89.2%</div>
                  <div className="text-sm text-green-600">Follow-up rate</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div>
                  <h4 className="font-bold text-blue-900">Average Deal Size</h4>
                  <p className="text-sm text-blue-700">Per verkoop</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-900">{formatCurrency(32500)}</div>
                  <div className="text-sm text-blue-600">+12% vs vorig jaar</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportsLayout>
  );
};

export default Reports;
