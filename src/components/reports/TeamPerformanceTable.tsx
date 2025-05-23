
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamMember } from "@/types/reports";
import { Users, Trophy, Target, Clock } from "lucide-react";

interface TeamPerformanceTableProps {
  teamMembers: TeamMember[];
}

export const TeamPerformanceTable: React.FC<TeamPerformanceTableProps> = ({ teamMembers }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPerformanceBadge = (conversionRate: number) => {
    if (conversionRate >= 80) return <Badge className="bg-green-500">Excellent</Badge>;
    if (conversionRate >= 65) return <Badge className="bg-blue-500">Goed</Badge>;
    if (conversionRate >= 50) return <Badge className="bg-yellow-500">Gemiddeld</Badge>;
    return <Badge variant="destructive">Verbetering Nodig</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Performance Overzicht
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium">Medewerker</th>
                <th className="text-left p-4 font-medium">Leads Toegewezen</th>
                <th className="text-left p-4 font-medium">Leads Geconverteerd</th>
                <th className="text-left p-4 font-medium">Conversie Ratio</th>
                <th className="text-left p-4 font-medium">Omzet</th>
                <th className="text-left p-4 font-medium">Reactietijd</th>
                <th className="text-left p-4 font-medium">Performance</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => {
                const conversionRate = (member.leadsConverted / member.leadsAssigned) * 100;
                return (
                  <tr key={member.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{member.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        {member.leadsAssigned}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-green-600" />
                        {member.leadsConverted}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{conversionRate.toFixed(1)}%</span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-green-600">
                        {formatCurrency(member.revenue)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {member.responseTime}h
                      </div>
                    </td>
                    <td className="p-4">
                      {getPerformanceBadge(conversionRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
