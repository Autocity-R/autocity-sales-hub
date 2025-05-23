
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  Target, 
  Calculator,
  PiggyBank,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Percent,
  CreditCard,
  Building
} from "lucide-react";
import { FinancialMetrics } from "@/types/reports";

interface FinancialAnalyticsProps {
  financial: FinancialMetrics;
}

export const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ financial }) => {
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

  // Mock data voor financiële trends
  const profitTrends = [
    { maand: "Jan", bruttoWinst: 1250000, nettoWinst: 720000, omzet: 5200000 },
    { maand: "Feb", bruttoWinst: 1180000, nettoWinst: 680000, omzet: 4900000 },
    { maand: "Mar", bruttoWinst: 1420000, nettoWinst: 820000, omzet: 5800000 },
    { maand: "Apr", bruttoWinst: 1580000, nettoWinst: 920000, omzet: 6400000 },
    { maand: "Mei", bruttoWinst: 1480000, nettoWinst: 850000, omzet: 6100000 },
    { maand: "Jun", bruttoWinst: 1620000, nettoWinst: 980000, omzet: 6800000 },
  ];

  const kostenVerdeling = [
    { categorie: "Inkoop Voertuigen", bedrag: 3200000, percentage: 65.8, kleur: "#EF4444" },
    { categorie: "Personeelskosten", bedrag: 580000, percentage: 11.9, kleur: "#F59E0B" },
    { categorie: "Marketing & Verkoop", bedrag: 320000, percentage: 6.6, kleur: "#10B981" },
    { categorie: "Facilitaire Kosten", bedrag: 280000, percentage: 5.8, kleur: "#3B82F6" },
    { categorie: "Overige Kosten", bedrag: 470000, percentage: 9.7, kleur: "#8B5CF6" },
  ];

  const chartConfigs = {
    profitTrends: {
      bruttoWinst: { label: "Brutto Winst", color: "#10B981" },
      nettoWinst: { label: "Netto Winst", color: "#3B82F6" },
      omzet: { label: "Omzet", color: "#8B5CF6" },
    },
  };

  return (
    <div className="space-y-8">
      {/* Financiële KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Euro className="h-10 w-10 text-green-200" />
              <div className="text-right">
                <div className="text-xs text-green-200">Totale Omzet</div>
                <Badge className="bg-white/20 text-white">
                  {financial.profitGrowth > 0 ? '+' : ''}{formatPercentage(financial.profitGrowth)}
                </Badge>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{formatCurrency(financial.totalRevenue)}</h3>
            <p className="text-green-200">Deze Periode</p>
            <div className="mt-2 flex items-center text-xs">
              {financial.profitGrowth > 0 ? (
                <ArrowUp className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDown className="w-3 h-3 mr-1" />
              )}
              <span>vs. vorige periode</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <PiggyBank className="h-10 w-10 text-blue-200" />
              <div className="text-right">
                <div className="text-xs text-blue-200">Bruto Winst</div>
                <Badge className="bg-white/20 text-white">{formatPercentage(financial.grossMargin)}</Badge>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{formatCurrency(financial.grossProfit)}</h3>
            <p className="text-blue-200">Bruto Marge</p>
            <div className="mt-2 flex items-center text-xs">
              <Target className="w-3 h-3 mr-1" />
              <span>Gezonde marges</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Calculator className="h-10 w-10 text-purple-200" />
              <div className="text-right">
                <div className="text-xs text-purple-200">Netto Winst</div>
                <Badge className="bg-white/20 text-white">{formatPercentage(financial.netMargin)}</Badge>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{formatCurrency(financial.netProfit)}</h3>
            <p className="text-purple-200">Na Belastingen</p>
            <div className="mt-2 flex items-center text-xs">
              <Percent className="w-3 h-3 mr-1" />
              <span>Netto rendement</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <CreditCard className="h-10 w-10 text-orange-200" />
              <div className="text-right">
                <div className="text-xs text-orange-200">Cashflow</div>
                <Badge className="bg-white/20 text-white">Positief</Badge>
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1">{formatCurrency(financial.cashFlow)}</h3>
            <p className="text-orange-200">Operationele Cashflow</p>
            <div className="mt-2 flex items-center text-xs">
              <Building className="w-3 h-3 mr-1" />
              <span>Liquide positie</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Winst Trends & Kosten Analyse */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Winst Trends Chart */}
        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <TrendingUp className="h-6 w-6" />
              Winst & Omzet Trends (6 Maanden)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[400px]">
              <ChartContainer config={chartConfigs.profitTrends}>
                <AreaChart data={profitTrends}>
                  <defs>
                    <linearGradient id="bruttoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="nettoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="maand" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="bruttoWinst" 
                    stroke="#10B981" 
                    fill="url(#bruttoGradient)"
                    strokeWidth={3}
                    name="Brutto Winst"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="nettoWinst" 
                    stroke="#3B82F6" 
                    fill="url(#nettoGradient)"
                    strokeWidth={3}
                    name="Netto Winst"
                  />
                </AreaChart>
              </ChartContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatPercentage(financial.grossMargin)}</div>
                <div className="text-sm text-gray-600">Gem. Bruto Marge</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatPercentage(financial.netMargin)}</div>
                <div className="text-sm text-gray-600">Gem. Netto Marge</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(financial.ebitda)}</div>
                <div className="text-sm text-gray-600">EBITDA</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kosten Verdeling */}
        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Calculator className="h-6 w-6" />
              Kosten Verdeling Analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] mb-4">
              <ChartContainer config={{}}>
                <PieChart>
                  <Pie
                    data={kostenVerdeling}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="bedrag"
                  >
                    {kostenVerdeling.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.kleur} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 shadow-lg rounded-lg border">
                            <p className="font-medium">{data.categorie}</p>
                            <p className="text-sm text-gray-600">Bedrag: {formatCurrency(data.bedrag)}</p>
                            <p className="text-sm text-gray-600">Percentage: {data.percentage}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-3">
              {kostenVerdeling.map((kosten, index) => (
                <div key={kosten.categorie} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: kosten.kleur }}
                    />
                    <div>
                      <div className="font-medium">{kosten.categorie}</div>
                      <div className="text-sm text-gray-600">{kosten.percentage}% van totaal</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(kosten.bedrag)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financiële Samenvattingen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              Winstgevendheid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Bruto Winst</span>
              <span className="font-bold text-green-700">{formatCurrency(financial.grossProfit)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Operationele Kosten</span>
              <span className="font-bold text-blue-700">{formatCurrency(financial.operatingExpenses)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium">Netto Winst</span>
              <span className="font-bold text-purple-700">{formatCurrency(financial.netProfit)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Percent className="h-5 w-5" />
              Marges & Ratio's
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Bruto Marge</span>
              <Badge className="bg-green-500 text-white">{formatPercentage(financial.grossMargin)}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Netto Marge</span>
              <Badge className="bg-blue-500 text-white">{formatPercentage(financial.netMargin)}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium">Winst Groei</span>
              <Badge className={`${financial.profitGrowth > 0 ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                {financial.profitGrowth > 0 ? '+' : ''}{formatPercentage(financial.profitGrowth)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <CreditCard className="h-5 w-5" />
              Cashflow & Liquiditeit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium">Operationele Cashflow</span>
              <span className="font-bold text-orange-700">{formatCurrency(financial.cashFlow)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-medium">EBITDA</span>
              <span className="font-bold text-indigo-700">{formatCurrency(financial.ebitda)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Liquide Positie</span>
              <Badge className="bg-green-500 text-white">Gezond</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
