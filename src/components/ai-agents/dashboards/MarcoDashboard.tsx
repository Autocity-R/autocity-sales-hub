import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Truck, FileText, ShieldCheck, CreditCard, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG = [
  { key: 'onderweg', label: 'Onderweg', icon: Truck, statusFilter: 'transportStatus' },
  { key: 'niet_aangemeld', label: 'Wacht aanmelding', icon: FileText },
  { key: 'aanvraag_ontvangen', label: 'Aanvraag ontvangen', icon: BookOpen },
  { key: 'aangekomen', label: 'Aangekomen / wacht RDW', icon: Clock },
  { key: 'goedgekeurd', label: 'Goedgekeurd / wacht BPM', icon: ShieldCheck },
  { key: 'bpm_betaald', label: 'BPM betaald / wacht inschrijving', icon: CreditCard },
  { key: 'ingeschreven', label: 'Ingeschreven', icon: CheckCircle },
  { key: 'b2b_papers', label: 'B2B papieren verwacht', icon: FileText },
];

export const MarcoDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['marco-dashboard'],
    queryFn: async () => {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, import_status, status, details, goedgekeurd_at, bpm_betaald_at, aangekomen_at, created_at')
        .neq('status', 'afgeleverd');

      if (error) throw error;

      const filtered = (vehicles || []).filter(v => {
        const d = v.details as any;
        return d?.isTradeIn !== true && d?.isTradeIn !== 'true' && !d?.isLoanCar;
      });

      const counts: Record<string, number> = {
        onderweg: 0, niet_aangemeld: 0, aanvraag_ontvangen: 0,
        aangekomen: 0, goedgekeurd: 0, bpm_betaald: 0,
        ingeschreven: 0, b2b_papers: 0,
      };

      const alerts: { type: 'red' | 'orange'; message: string; vehicle: string }[] = [];
      const now = Date.now();
      const DAY = 86400000;

      filtered.forEach(v => {
        const d = v.details as any;
        const status = v.import_status || 'niet_gestart';

        if (d?.transportStatus === 'onderweg') counts.onderweg++;
        if (status !== 'niet_gestart') counts[status] = (counts[status] || 0) + 1;

        if (status === 'goedgekeurd' && v.goedgekeurd_at) {
          const days = (now - new Date(v.goedgekeurd_at).getTime()) / DAY;
          if (days > 7) alerts.push({ type: 'red', message: `Goedgekeurd >7 dagen (${Math.round(days)}d)`, vehicle: d?.brand ? `${d.brand} ${d?.model || ''}` : v.id });
        }
        if (status === 'bpm_betaald' && v.bpm_betaald_at) {
          const days = (now - new Date(v.bpm_betaald_at).getTime()) / DAY;
          if (days > 5) alerts.push({ type: 'red', message: `BPM betaald >5 dagen (${Math.round(days)}d)`, vehicle: d?.brand ? `${d.brand} ${d?.model || ''}` : v.id });
        }
        if (status === 'aangekomen' && v.aangekomen_at) {
          const days = (now - new Date(v.aangekomen_at).getTime()) / DAY;
          if (days > 14) alerts.push({ type: 'orange', message: `Aangekomen >14 dagen (${Math.round(days)}d)`, vehicle: d?.brand ? `${d.brand} ${d?.model || ''}` : v.id });
        }

        if (v.status === 'verkocht_b2b' && d?.papersReceived !== true) {
          counts.b2b_papers++;
        }
      });

      return { counts, alerts, total: filtered.length };
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="grid grid-cols-4 gap-3">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Status tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUS_CONFIG.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Icon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.counts[key] || 0}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alerts ({data.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant={alert.type === 'red' ? 'destructive' : 'secondary'} className={alert.type === 'orange' ? 'bg-orange-500 text-white' : ''}>
                  {alert.type === 'red' ? 'URGENT' : 'LET OP'}
                </Badge>
                <span className="font-medium">{alert.vehicle}</span>
                <span className="text-muted-foreground">— {alert.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
