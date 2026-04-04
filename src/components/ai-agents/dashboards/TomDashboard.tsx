import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, FileText, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfDay, endOfDay } from "date-fns";

export const TomDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['tom-dashboard'],
    queryFn: async () => {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, status, details, aangekomen_at')
        .neq('status', 'afgeleverd');

      if (error) throw error;
      const items = vehicles || [];
      const today = new Date();

      let onderweg = 0;
      let aangekomenVandaag = 0;
      let b2bPapiersVerwacht = 0;
      const onderwegList: { name: string; id: string }[] = [];

      items.forEach(v => {
        const d = v.details as any;
        if (d?.transportStatus === 'onderweg') {
          onderweg++;
          onderwegList.push({ name: `${d?.brand || ''} ${d?.model || ''}`.trim() || v.id, id: v.id });
        }
        if (v.aangekomen_at) {
          const at = new Date(v.aangekomen_at);
          if (at >= startOfDay(today) && at <= endOfDay(today)) {
            aangekomenVandaag++;
          }
        }
        if (v.status === 'verkocht_b2b' && d?.papersReceived !== true) {
          b2bPapiersVerwacht++;
        }
      });

      return { onderweg, aangekomenVandaag, b2bPapiersVerwacht, onderwegList: onderwegList.slice(0, 15) };
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="grid grid-cols-3 gap-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-400/10"><Truck className="h-5 w-5 text-red-400" /></div>
            <div><p className="text-2xl font-bold">{data?.onderweg || 0}</p><p className="text-xs text-muted-foreground">Onderweg</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-400/10"><MapPin className="h-5 w-5 text-red-400" /></div>
            <div><p className="text-2xl font-bold">{data?.aangekomenVandaag || 0}</p><p className="text-xs text-muted-foreground">Aangekomen vandaag</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-400/10"><FileText className="h-5 w-5 text-red-400" /></div>
            <div><p className="text-2xl font-bold">{data?.b2bPapiersVerwacht || 0}</p><p className="text-xs text-muted-foreground">B2B papieren verwacht</p></div>
          </CardContent>
        </Card>
      </div>

      {data?.onderwegList && data.onderwegList.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Auto's onderweg</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.onderwegList.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Truck className="h-3 w-3 text-muted-foreground" />
                <span>{v.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
