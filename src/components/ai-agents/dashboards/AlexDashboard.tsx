import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const AlexDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['alex-dashboard'],
    queryFn: async () => {
      // Voorraad stats
      const { count: voorraadCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'voorraad');

      // Onderweg
      const { data: allVehicles } = await supabase
        .from('vehicles')
        .select('id, details, import_status, status, goedgekeurd_at, bpm_betaald_at')
        .neq('status', 'afgeleverd');

      let onderweg = 0;
      let redAlerts = 0;
      let orangeAlerts = 0;
      const now = Date.now();
      const DAY = 86400000;

      (allVehicles || []).forEach(v => {
        const d = v.details as any;
        if (d?.transportStatus === 'onderweg') onderweg++;
        if (v.import_status === 'goedgekeurd' && v.goedgekeurd_at) {
          if ((now - new Date(v.goedgekeurd_at).getTime()) / DAY > 7) redAlerts++;
        }
        if (v.import_status === 'bpm_betaald' && v.bpm_betaald_at) {
          if ((now - new Date(v.bpm_betaald_at).getTime()) / DAY > 5) redAlerts++;
        }
      });

      // Open warranty claims
      const { count: openClaims } = await supabase
        .from('warranty_claims')
        .select('*', { count: 'exact', head: true })
        .or('status.eq.open,status.eq.in_behandeling,status.eq.pending');

      // Verkocht vandaag - rough count
      const { count: verkocht } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .in('status', ['verkocht_b2b', 'verkocht_b2c']);

      const greenStatus = redAlerts === 0 && orangeAlerts === 0;

      return {
        voorraad: voorraadCount || 0,
        onderweg,
        verkocht: verkocht || 0,
        openClaims: openClaims || 0,
        redAlerts,
        orangeAlerts,
        greenStatus,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="grid grid-cols-3 gap-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  const summaryItems = [
    { label: 'Voorraad', value: data?.voorraad || 0, icon: BarChart3, color: 'text-purple-800' },
    { label: 'Onderweg', value: data?.onderweg || 0, icon: BarChart3, color: 'text-purple-800' },
    { label: 'Verkocht', value: data?.verkocht || 0, icon: BarChart3, color: 'text-purple-800' },
    { label: 'Open claims', value: data?.openClaims || 0, icon: BarChart3, color: 'text-purple-800' },
  ];

  return (
    <div className="space-y-4">
      {/* Overall status */}
      <Card className={data?.redAlerts ? "border-destructive" : data?.orangeAlerts ? "border-orange-500" : "border-green-500"}>
        <CardContent className="p-4 flex items-center gap-3">
          {data?.redAlerts ? (
            <AlertTriangle className="h-6 w-6 text-destructive" />
          ) : data?.orangeAlerts ? (
            <AlertCircle className="h-6 w-6 text-orange-500" />
          ) : (
            <CheckCircle className="h-6 w-6 text-green-500" />
          )}
          <div>
            <p className="font-semibold text-sm">
              {data?.redAlerts ? `${data.redAlerts} urgente alerts` : data?.orangeAlerts ? `${data.orangeAlerts} waarschuwingen` : 'Alles op schema'}
            </p>
            <p className="text-xs text-muted-foreground">Bedrijfsstatus overzicht</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryItems.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-800/10"><Icon className={`h-5 w-5 ${color}`} /></div>
              <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
