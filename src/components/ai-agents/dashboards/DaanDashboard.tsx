import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const DaanDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['daan-dashboard'],
    queryFn: async () => {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, status, details, created_at')
        .eq('status', 'voorraad');

      if (error) throw error;
      const items = vehicles || [];
      const now = Date.now();
      const DAY = 86400000;

      let totalValue = 0;
      let over70 = 0;
      let between50and70 = 0;
      let noOnlineDate = 0;
      const longStanding: { name: string; days: number; price: number }[] = [];

      items.forEach(v => {
        const d = v.details as any;
        const price = d?.sellingPrice || d?.price || 0;
        totalValue += Number(price);

        const onlineDate = d?.online_since_date;
        if (!onlineDate) {
          noOnlineDate++;
        } else {
          const days = Math.floor((now - new Date(onlineDate).getTime()) / DAY);
          if (days > 70) {
            over70++;
            longStanding.push({ name: `${d?.brand || ''} ${d?.model || ''}`.trim() || v.id, days, price: Number(price) });
          } else if (days >= 50) {
            between50and70++;
          }
        }
      });

      longStanding.sort((a, b) => b.days - a.days);

      return { total: items.length, totalValue, over70, between50and70, noOnlineDate, longStanding: longStanding.slice(0, 15) };
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="grid grid-cols-4 gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Package className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold">{data?.total || 0}</p><p className="text-xs text-muted-foreground">Totaal voorraad</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><DollarSign className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold">€{((data?.totalValue || 0) / 1000).toFixed(0)}k</p><p className="text-xs text-muted-foreground">Voorraadwaarde</p></div>
          </CardContent>
        </Card>
        <Card className={data?.over70 ? "border-destructive" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
            <div><p className="text-2xl font-bold">{data?.over70 || 0}</p><p className="text-xs text-muted-foreground">&gt;70 dagen online</p></div>
          </CardContent>
        </Card>
        <Card className={data?.between50and70 ? "border-orange-500" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Clock className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold">{data?.between50and70 || 0}</p><p className="text-xs text-muted-foreground">50-70 dagen</p></div>
          </CardContent>
        </Card>
      </div>

      {data?.noOnlineDate ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{data.noOnlineDate}</span> auto's zonder online_since_date</p>
          </CardContent>
        </Card>
      ) : null}

      {data?.longStanding && data.longStanding.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Langst staande auto's</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.longStanding.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{v.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{v.days}d</Badge>
                    <span className="text-muted-foreground">€{v.price.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
