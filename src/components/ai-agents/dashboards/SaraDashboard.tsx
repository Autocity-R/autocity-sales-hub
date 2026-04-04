import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const SaraDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['sara-dashboard'],
    queryFn: async () => {
      const { data: claims, error } = await supabase
        .from('warranty_claims')
        .select('*')
        .or('status.eq.open,status.eq.in_behandeling,status.eq.pending');

      if (error) throw error;
      const items = claims || [];
      const now = Date.now();
      const DAY = 86400000;

      let totalOpen = items.length;
      let totalDays = 0;
      const oldClaims: any[] = [];

      items.forEach(c => {
        const days = Math.floor((now - new Date(c.created_at).getTime()) / DAY);
        totalDays += days;
        if (days > 14) {
          oldClaims.push({ ...c, days });
        }
      });

      const avgDays = totalOpen > 0 ? Math.round(totalDays / totalOpen) : 0;

      return { totalOpen, avgDays, oldClaims: oldClaims.sort((a, b) => b.days - a.days), claims: items };
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="grid grid-cols-3 gap-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><ShieldAlert className="h-5 w-5 text-purple-500" /></div>
            <div><p className="text-2xl font-bold">{data?.totalOpen || 0}</p><p className="text-xs text-muted-foreground">Open claims</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Clock className="h-5 w-5 text-purple-500" /></div>
            <div><p className="text-2xl font-bold">{data?.avgDays || 0}d</p><p className="text-xs text-muted-foreground">Gem. doorlooptijd</p></div>
          </CardContent>
        </Card>
        <Card className={data?.oldClaims?.length ? "border-destructive" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
            <div><p className="text-2xl font-bold">{data?.oldClaims?.length || 0}</p><p className="text-xs text-muted-foreground">&gt;14 dagen open</p></div>
          </CardContent>
        </Card>
      </div>

      {data?.oldClaims && data.oldClaims.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Claims &gt;14 dagen</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.oldClaims.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.claim_number || c.id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{c.days}d</Badge>
                  <span className="text-muted-foreground">{c.description?.slice(0, 40) || 'Geen beschrijving'}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
