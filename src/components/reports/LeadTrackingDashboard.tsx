
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PerformanceData } from "@/types/reports";
import { 
  Users, 
  Target, 
  Clock, 
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  CheckCircle
} from "lucide-react";

interface LeadTrackingDashboardProps {
  reportData: PerformanceData;
}

export const LeadTrackingDashboard: React.FC<LeadTrackingDashboardProps> = ({ reportData }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Mock lead pipeline data
  const leadPipeline = [
    { status: "Nieuwe Leads", count: 45, percentage: 20.6, color: "bg-blue-500" },
    { status: "Contact Gemaakt", count: 38, percentage: 17.4, color: "bg-yellow-500" },
    { status: "Gekwalificeerd", count: 32, percentage: 14.7, color: "bg-orange-500" },
    { status: "Voorstel Gestuurd", count: 28, percentage: 12.8, color: "bg-purple-500" },
    { status: "Onderhandeling", count: 18, percentage: 8.3, color: "bg-indigo-500" },
    { status: "Gewonnen", count: 24, percentage: 11.0, color: "bg-green-500" },
    { status: "Verloren", count: 33, percentage: 15.1, color: "bg-red-500" }
  ];

  return (
    <div className="space-y-6">
      {/* Lead Pipeline Overview */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Lead Pipeline & Conversie Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pipeline Stages */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Lead Status Verdeling</h3>
              {leadPipeline.map((stage, index) => (
                <div key={stage.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{stage.status}</span>
                    <span className="text-sm text-gray-500">{stage.count} leads</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={stage.percentage} className="flex-1" />
                    <span className="text-sm font-medium w-12">{stage.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Lead Performance Stats */}
            <div className="space-y-6">
              <h3 className="font-semibold text-lg mb-4">Performance Indicatoren</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Totale Leads</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{reportData.leads.totalLeads}</div>
                  <div className="text-xs text-blue-600">Deze periode</div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Conversie Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">{reportData.leads.conversionRate.toFixed(1)}%</div>
                  <div className="text-xs text-green-600">Van lead naar verkoop</div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Reactietijd</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">{reportData.leads.responseTime}u</div>
                  <div className="text-xs text-orange-600">Gemiddeld eerste contact</div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Cyclus Tijd</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">{reportData.leads.avgDaysToClose}</div>
                  <div className="text-xs text-purple-600">Dagen tot sluiting</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Team Lead Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-medium">Medewerker</th>
                  <th className="text-left p-4 font-medium">Leads</th>
                  <th className="text-left p-4 font-medium">Geconverteerd</th>
                  <th className="text-left p-4 font-medium">Conversie %</th>
                  <th className="text-left p-4 font-medium">Omzet</th>
                  <th className="text-left p-4 font-medium">Reactietijd</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.teamPerformance.map((member) => {
                  const conversionRate = (member.leadsConverted / member.leadsAssigned) * 100;
                  return (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{member.name}</td>
                      <td className="p-4">{member.leadsAssigned}</td>
                      <td className="p-4 text-green-600 font-medium">{member.leadsConverted}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{conversionRate.toFixed(1)}%</span>
                          <Progress value={conversionRate} className="w-16" />
                        </div>
                      </td>
                      <td className="p-4 font-medium text-green-600">
                        {formatCurrency(member.revenue)}
                      </td>
                      <td className="p-4">{member.responseTime}h</td>
                      <td className="p-4">
                        <Badge 
                          className={
                            conversionRate >= 80 ? "bg-green-500" :
                            conversionRate >= 65 ? "bg-blue-500" :
                            conversionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                          }
                        >
                          {conversionRate >= 80 ? "Excellent" :
                           conversionRate >= 65 ? "Goed" :
                           conversionRate >= 50 ? "Gemiddeld" : "Verbetering"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
