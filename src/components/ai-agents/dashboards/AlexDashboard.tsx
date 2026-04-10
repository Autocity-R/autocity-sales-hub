import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb,
  Brain, CheckCircle, XCircle, Clock, BarChart3, DollarSign,
  Timer, Package, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AlexDashboard: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── KPI Data ──
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['alex-kpis'],
    queryFn: async () => {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status, selling_price, purchase_price, sold_date, online_since_date, details');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const prevMonthEnd = monthStart;
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();

      let verkopen_mtd = 0, verkopen_vorige = 0;
      let b2c_marges: number[] = [], b2b_marges: number[] = [];
      let omloop: number[] = [];
      let voorraadRegulair = 0, voorraadRegulairWaarde = 0;
      let voorraadInruil = 0, voorraadInruilWaarde = 0;
      let omzet_90d = 0;

      for (const v of (vehicles || [])) {
        const d = v.details as any;
        const isTradeIn = d?.isTradeIn === true || d?.isTradeIn === 'true';
        const isSold = ['verkocht_b2c', 'verkocht_b2b', 'afgeleverd'].includes(v.status);
        const isB2B = d?.warrantyPackage === 'geen_garantie_b2b';

        if (isSold && v.sold_date && v.sold_date >= monthStart) {
          verkopen_mtd++;
          if (!isTradeIn && v.selling_price && v.purchase_price && v.purchase_price > 0) {
            if (isB2B) b2b_marges.push(v.selling_price - v.purchase_price);
            else b2c_marges.push(((v.selling_price - v.purchase_price) / v.purchase_price) * 100);
          }
        }
        if (isSold && v.sold_date && v.sold_date >= prevMonthStart && v.sold_date < prevMonthEnd) verkopen_vorige++;
        // Omloopsnelheid: 90 dagen, alleen niet-inruil
        if (isSold && !isTradeIn && v.sold_date && v.sold_date >= ninetyDaysAgo && v.online_since_date) {
          const days = (new Date(v.sold_date).getTime() - new Date(v.online_since_date).getTime()) / 86400000;
          if (days > 0) omloop.push(days);
        }
        // 90-dagen omzet voor voorraadrotatie
        if (isSold && v.sold_date && v.sold_date >= ninetyDaysAgo) {
          omzet_90d += (v.selling_price || 0);
        }
        if (v.status === 'voorraad') {
          if (isTradeIn) {
            voorraadInruil++;
            voorraadInruilWaarde += (v.purchase_price || 0);
          } else {
            voorraadRegulair++;
            voorraadRegulairWaarde += (v.purchase_price || 0);
          }
        }
      }

      const avg = (a: number[]) => a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : 0;
      const omzet_mtd = (vehicles || [])
        .filter(v => ['verkocht_b2c', 'verkocht_b2b', 'afgeleverd'].includes(v.status) && v.sold_date && v.sold_date >= monthStart)
        .reduce((s, v) => s + (v.selling_price || 0), 0);

      const totaalVoorraad = voorraadRegulair + voorraadInruil;
      const totaalVoorraadWaarde = voorraadRegulairWaarde + voorraadInruilWaarde;

      // Voorraadrotatie: geannualiseerde omzet / voorraadwaarde
      const jaaromzet = (omzet_90d / 3) * 12;
      const voorraadRotatie = totaalVoorraadWaarde > 0
        ? Math.round((jaaromzet / totaalVoorraadWaarde) * 10) / 10
        : 0;
      };
    },
    refetchInterval: 60000,
  });

  // ── Daily signals ──
  const today = new Date().toISOString().split('T')[0];
  const { data: signals, isLoading: signalsLoading } = useQuery({
    queryKey: ['alex-signals', today],
    queryFn: async () => {
      const { data } = await supabase
        .from('alex_insights')
        .select('type, signaal, aanbeveling, prioriteit, created_at')
        .eq('datum', today)
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    refetchInterval: 120000,
  });

  // ── Market memory ──
  const { data: marketMemory, isLoading: memoryLoading } = useQuery({
    queryKey: ['alex-memory'],
    queryFn: async () => {
      const { data } = await supabase
        .from('alex_market_memory')
        .select('categorie, onderwerp, inzicht, impact_op_strategie, beoordeeld_op')
        .eq('geldigheid', 'actueel')
        .order('updated_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    refetchInterval: 120000,
  });

  // ── Open decisions ──
  const { data: decisions, isLoading: decisionsLoading } = useQuery({
    queryKey: ['alex-decisions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('alex_decisions')
        .select('id, beslissing, context, adressaat, urgentie, datum, status')
        .eq('status', 'open')
        .order('urgentie', { ascending: true })
        .order('datum', { ascending: false });
      return data || [];
    },
    refetchInterval: 120000,
  });

  // ── Decision mutation ──
  const updateDecision = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('alex_decisions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alex-decisions'] });
      toast({ title: 'Beslissing bijgewerkt' });
    },
  });

  const isLoading = kpisLoading || signalsLoading || memoryLoading || decisionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid grid-cols-2 gap-4">{Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // ── KPI config ──
  const kpiTiles = [
    {
      label: 'Verkopen MTD',
      value: kpis?.verkopen_mtd || 0,
      sub: `vorige: ${kpis?.verkopen_vorige || 0}`,
      icon: BarChart3,
      trend: (kpis?.verkopen_mtd || 0) > (kpis?.verkopen_vorige || 0) ? 'up' : (kpis?.verkopen_mtd || 0) < (kpis?.verkopen_vorige || 0) ? 'down' : 'flat',
      color: (kpis?.verkopen_mtd || 0) >= (kpis?.verkopen_vorige || 0) ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'B2C Marge',
      value: `${kpis?.b2c_marge || 0}%`,
      sub: 'doel: ≥15%',
      icon: DollarSign,
      trend: (kpis?.b2c_marge || 0) >= 15 ? 'up' : 'down',
      color: (kpis?.b2c_marge || 0) >= 15 ? 'text-green-600' : (kpis?.b2c_marge || 0) >= 13 ? 'text-orange-500' : 'text-red-600',
    },
    {
      label: 'B2B Marge',
      value: `€${Math.round(kpis?.b2b_marge || 0).toLocaleString()}`,
      sub: 'doel: ≥€2.000',
      icon: DollarSign,
      trend: (kpis?.b2b_marge || 0) >= 2000 ? 'up' : 'down',
      color: (kpis?.b2b_marge || 0) >= 2000 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Omloopsnelheid',
      value: `${kpis?.omloopsnelheid || 0}d`,
      sub: 'doel: ≤45 dagen',
      icon: Timer,
      trend: (kpis?.omloopsnelheid || 0) <= 45 ? 'up' : 'down',
      color: (kpis?.omloopsnelheid || 0) <= 45 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Voorraad ROI',
      value: `${kpis?.voorraadRoi || 0}%`,
      sub: `${kpis?.voorraadRegulair || 0} regulier + ${kpis?.voorraadInruil || 0} inruil = ${kpis?.voorraadTotaal || 0} totaal | €${Math.round((kpis?.voorraadWaarde || 0) / 1000).toLocaleString()}k`,
      icon: Package,
      trend: (kpis?.voorraadRoi || 0) >= 25 ? 'up' : 'down',
      color: (kpis?.voorraadRoi || 0) >= 25 ? 'text-green-600' : 'text-purple-700',
    },
  ];

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const priorityColor = (p: string) => {
    if (p === 'hoog') return 'destructive';
    if (p === 'middel') return 'secondary';
    return 'outline';
  };

  const signalIcon = (type: string) => {
    if (type === 'risico') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (type === 'kans') return <Lightbulb className="h-4 w-4 text-green-500" />;
    if (type === 'markt') return <TrendingUp className="h-4 w-4 text-blue-500" />;
    return <Users className="h-4 w-4 text-orange-500" />;
  };

  return (
    <div className="space-y-4">
      {/* ── Section 1: KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpiTiles.map(({ label, value, sub, icon: Icon, trend, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <TrendIcon trend={trend} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xs text-muted-foreground/70">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Section 2: Signals + Memory ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Interne signalen */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Signalen vandaag
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(signals?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen signalen vandaag — briefing volgt om 07:00</p>
            ) : (
              <ScrollArea className="h-[220px]">
                <div className="space-y-2">
                  {signals?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                      {signalIcon(s.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={priorityColor(s.prioriteit || 'laag')} className="text-xs">
                            {s.prioriteit}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{s.type}</span>
                        </div>
                        <p className="text-sm mt-0.5">{s.signaal}</p>
                        {s.aanbeveling && <p className="text-xs text-muted-foreground mt-0.5">→ {s.aanbeveling}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Marktgeheugen */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Marktgeheugen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(marketMemory?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Alex is nog aan het leren — geheugen wordt opgebouwd</p>
            ) : (
              <ScrollArea className="h-[220px]">
                <div className="space-y-2">
                  {marketMemory?.map((m, i) => (
                    <div key={i} className="p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs">{m.categorie}</Badge>
                        <span className="text-xs text-muted-foreground font-medium">{m.onderwerp}</span>
                      </div>
                      <p className="text-sm">{m.inzicht}</p>
                      {m.impact_op_strategie && (
                        <p className="text-xs text-muted-foreground mt-0.5">Impact: {m.impact_op_strategie}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 3: Open decisions ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Openstaande beslissingen ({decisions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(decisions?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Geen openstaande beslissingen</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {decisions?.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={priorityColor(d.urgentie || 'laag')} className="text-xs">
                          {d.urgentie}
                        </Badge>
                        {d.adressaat && <span className="text-xs text-muted-foreground">→ {d.adressaat}</span>}
                        <span className="text-xs text-muted-foreground ml-auto">{d.datum}</span>
                      </div>
                      <p className="text-sm font-medium">{d.beslissing}</p>
                      {d.context && <p className="text-xs text-muted-foreground mt-0.5">{d.context}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        onClick={() => updateDecision.mutate({ id: d.id, status: 'opgevolgd' })}
                        title="Opgevolgd"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => updateDecision.mutate({ id: d.id, status: 'niet_opgevolgd' })}
                        title="Niet opgevolgd"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
