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
    afspraak: leads.filter(l => l.status === 'appointment').length,
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
    <div className="space-y-6 p-6">
      {/* Hoofd Statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium mb-1">Totaal Leads</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totaal}</p>
                <p className="text-xs text-blue-600 mt-1">Alle leads</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium mb-1">Nieuwe Leads</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.nieuw}</p>
                <p className="text-xs text-yellow-600 mt-1">Wachten op contact</p>
              </div>
              <div className="bg-yellow-500 p-3 rounded-full">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium mb-1">Afspraak</p>
                <p className="text-3xl font-bold text-purple-900">{stats.afspraak}</p>
                <p className="text-xs text-purple-600 mt-1">Geplande afspraken</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-full">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium mb-1">Conversie Ratio</p>
                <p className="text-3xl font-bold text-green-900">{stats.conversieRatio}%</p>
                <p className="text-xs text-green-600 mt-1">Verkocht / Totaal</p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Verdeling */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gray-50 rounded-t-xl border-b">
          <CardTitle className="text-xl font-bold text-gray-900">Status Verdeling</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.nieuw}</div>
              <div className="text-sm text-blue-700 font-medium">Nieuw</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.afspraak}</div>
              <div className="text-sm text-purple-700 font-medium">Afspraak</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.verkocht}</div>
              <div className="text-sm text-green-700 font-medium">Gewonnen</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.verloren}</div>
              <div className="text-sm text-red-700 font-medium">Verloren</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Overzicht */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gray-50 rounded-t-xl border-b">
          <CardTitle className="text-xl font-bold text-gray-900">Platform Prestaties</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {platformStats.map((stat) => (
              <div key={stat.source} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white p-3 rounded-full shadow-sm">
                      <span className="text-2xl">{stat.config.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{stat.config.label}</h3>
                      <p className="text-gray-600 text-sm">{stat.totalLeads} leads</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stat.convertedLeads}</p>
                      <p className="text-xs text-gray-600">Verkocht</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stat.conversionRate}%</p>
                      <p className="text-xs text-gray-600">Conversie</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{stat.avgScore}/100</p>
                      <p className="text-xs text-gray-600">Gem. Score</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Kwaliteit Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-600 text-sm font-medium mb-1 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Lead Kwaliteit
                </p>
                <p className="text-3xl font-bold text-indigo-900">{stats.gemiddeldeScore}/100</p>
                <p className="text-xs text-indigo-600 mt-1">Gemiddelde lead score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 text-sm font-medium mb-1 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Success Rate
                </p>
                <p className="text-3xl font-bold text-emerald-900">{stats.conversieRatio}%</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {stats.verkocht} van {stats.totaal} leads
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
