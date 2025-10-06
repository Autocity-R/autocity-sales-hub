import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/types/leads";
import { leadDisplayConfig } from "@/utils/leadDisplayConfig";
import { Users, TrendingUp, BarChart3, Clock, Target, DollarSign } from "lucide-react";

interface AnalyticsDashboardProps {
  leads: Lead[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ leads }) => {
  // Statistieken berekenen
  const stats = {
    totaal: leads.length,
    nieuw: leads.filter(l => l.status === 'new').length,
    gekwalificeerd: leads.filter(l => l.status === 'qualified').length,
    verkocht: leads.filter(l => l.status === 'won').length,
    verloren: leads.filter(l => l.status === 'lost').length,
    conversieRatio: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) : 0,
    gemiddeldeScore: leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + (lead.lead_score || 50), 0) / leads.length) : 50
  };

  // Platform statistieken
  const platformStats = Object.entries(leadDisplayConfig.source).map(([source, config]) => {
    const sourceLeads = leads.filter(l => l.source === source);
    const sourceConverted = sourceLeads.filter(l => l.status === 'won').length;
    const sourceLost = sourceLeads.filter(l => l.status === 'lost').length;
    const conversionRate = sourceLeads.length > 0 ? Math.round((sourceConverted / sourceLeads.length) * 100) : 0;
    const avgScore = sourceLeads.length > 0 ? Math.round(sourceLeads.reduce((sum, lead) => sum + (lead.lead_score || 50), 0) / sourceLeads.length) : 0;
    
    return {
      source,
      config,
      totalLeads: sourceLeads.length,
      convertedLeads: sourceConverted,
      lostLeads: sourceLost,
      conversionRate,
      avgScore
    };
  }).filter(stat => stat.totalLeads > 0); // Alleen platforms met leads tonen

  return (
    <div className="space-y-6">
      {/* Hoofd Statistieken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Totaal Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totaal}</div>
            <p className="text-xs text-muted-foreground">Alle leads</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Nieuwe Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.nieuw}</div>
            <p className="text-xs text-muted-foreground">Wachten op contact</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Gekwalificeerd
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.gekwalificeerd}</div>
            <p className="text-xs text-muted-foreground">Actieve prospects</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Conversie Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.conversieRatio}%</div>
            <p className="text-xs text-muted-foreground">Verkocht / Totaal</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Verdeling */}
      <Card>
        <CardHeader>
          <CardTitle>Status Verdeling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{stats.nieuw}</div>
              <div className="text-sm text-muted-foreground">Nieuw</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{stats.gekwalificeerd}</div>
              <div className="text-sm text-muted-foreground">Gekwalificeerd</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.verkocht}</div>
              <div className="text-sm text-muted-foreground">Verkocht</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{stats.verloren}</div>
              <div className="text-sm text-muted-foreground">Verloren</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Overzicht */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Prestaties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {platformStats.map((stat) => (
              <div key={stat.source} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{stat.config.icon}</span>
                  <div>
                    <p className="font-medium">{stat.config.label}</p>
                    <p className="text-sm text-muted-foreground">{stat.totalLeads} leads</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="font-medium text-green-600">{stat.convertedLeads}</p>
                    <p className="text-xs text-muted-foreground">Verkocht</p>
                  </div>
                  <div>
                    <p className="font-medium">{stat.conversionRate}%</p>
                    <p className="text-xs text-muted-foreground">Conversie</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-600">{stat.avgScore}/100</p>
                    <p className="text-xs text-muted-foreground">Gem. Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Kwaliteit Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Lead Kwaliteit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gemiddeldeScore}/100</div>
            <p className="text-xs text-muted-foreground">Gemiddelde lead score</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.conversieRatio}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.verkocht} van {stats.totaal} leads
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
