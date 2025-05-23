
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Euro,
  TrendingUp,
  Target,
  Clock,
  Users,
  Car,
  Phone,
  Calendar
} from "lucide-react";
import { PerformanceData } from "@/types/reports";

interface PerformanceMetricsProps {
  reportData: PerformanceData;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ reportData }) => {
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

  const metrics = [
    {
      title: "Totale Omzet",
      value: formatCurrency(reportData.sales.totalRevenue),
      icon: Euro,
      color: "bg-emerald-500",
      description: `${reportData.sales.totalUnits} voertuigen verkocht`,
      trend: "+12.5%"
    },
    {
      title: "Gemiddelde Marge",
      value: formatPercentage(reportData.sales.averageMargin),
      icon: TrendingUp,
      color: "bg-blue-500",
      description: "Per verkocht voertuig",
      trend: "+2.1%"
    },
    {
      title: "Lead Conversie",
      value: formatPercentage(reportData.leads.conversionRate),
      icon: Target,
      color: "bg-purple-500",
      description: `Van ${reportData.leads.totalLeads} leads`,
      trend: "+8.3%"
    },
    {
      title: "Gemiddelde Reactietijd",
      value: `${reportData.leads.responseTime}u`,
      icon: Clock,
      color: "bg-orange-500",
      description: "Eerste contact met lead",
      trend: "-1.2u"
    },
    {
      title: "Opvolg Percentage",
      value: formatPercentage(reportData.leads.followUpRate),
      icon: Phone,
      color: "bg-indigo-500",
      description: "Actieve lead opvolging",
      trend: "+5.7%"
    },
    {
      title: "Omloopsnelheid",
      value: `${reportData.turnoverRate} dagen`,
      icon: Calendar,
      color: "bg-teal-500",
      description: "Van voorraad tot verkoop",
      trend: "-2 dagen"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className={`absolute top-0 left-0 w-1 h-full ${metric.color}`} />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.color}/10`}>
                <metric.icon className={`h-5 w-5 text-white`} style={{ filter: 'brightness(0.8)' }} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">
                {metric.value}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {metric.description}
                </p>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  metric.trend.startsWith('+') 
                    ? 'bg-green-100 text-green-700' 
                    : metric.trend.startsWith('-') && metric.trend.includes('u')
                    ? 'bg-green-100 text-green-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {metric.trend}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
