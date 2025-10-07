import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lead } from "@/types/leads";
import { Clock, TrendingUp, Target, Award } from "lucide-react";

interface SalespersonStatsProps {
  leads: Lead[];
  salespersonId: string;
}

export const SalespersonStats: React.FC<SalespersonStatsProps> = ({
  leads,
  salespersonId
}) => {
  const myLeads = leads.filter(l => l.assignedTo === salespersonId);
  
  const stats = {
    total: myLeads.length,
    new: myLeads.filter(l => l.status === 'new').length,
    contacted: myLeads.filter(l => l.status === 'contacted').length,
    appointment: myLeads.filter(l => l.status === 'appointment').length,
    won: myLeads.filter(l => l.status === 'won').length,
    lost: myLeads.filter(l => l.status === 'lost').length,
    conversionRate: myLeads.length > 0 
      ? Math.round((myLeads.filter(l => l.status === 'won').length / myLeads.length) * 100) 
      : 0,
    avgResponseTime: myLeads.length > 0
      ? Math.round(myLeads.reduce((sum, l) => sum + (l.responseTime || 0), 0) / myLeads.length)
      : 0,
    avgScore: myLeads.length > 0
      ? Math.round(myLeads.reduce((sum, l) => sum + (l.lead_score || 50), 0) / myLeads.length)
      : 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Totaal Leads</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {stats.new} Nieuw
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {stats.appointment} Afspraak
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversie Ratio</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.conversionRate}%</div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.won} gewonnen van {stats.total}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gem. Response Tijd</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgResponseTime}u</div>
          <p className="text-xs text-muted-foreground mt-2">
            Gemiddelde reactietijd
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gem. Lead Score</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.avgScore}/100</div>
          <p className="text-xs text-muted-foreground mt-2">
            Kwaliteit van leads
          </p>
        </CardContent>
      </Card>
    </div>
  );
};