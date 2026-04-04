import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { nl } from "date-fns/locale";

export const LisaDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['lisa-dashboard'],
    queryFn: async () => {
      const today = new Date();
      const weekFromNow = addDays(today, 7);

      // Geplande afleveringen
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('type', 'aflevering')
        .gte('starttime', startOfDay(today).toISOString())
        .lte('starttime', endOfDay(weekFromNow).toISOString())
        .order('starttime');

      const todayAppts = (appointments || []).filter(a => 
        isWithinInterval(new Date(a.starttime), { start: startOfDay(today), end: endOfDay(today) })
      );

      // Ingeschreven maar niet afleverklaar
      const { data: ingeschreven } = await supabase
        .from('vehicles')
        .select('id, details, import_status')
        .eq('import_status', 'ingeschreven')
        .in('status', ['verkocht_b2c', 'verkocht_b2b']);

      // Verkocht B2C  
      const { data: verkocht } = await supabase
        .from('vehicles')
        .select('id, details, status')
        .eq('status', 'verkocht_b2c');

      return {
        todayCount: todayAppts.length,
        weekCount: (appointments || []).length,
        todayAppts,
        weekAppts: appointments || [],
        ingeschreven: ingeschreven || [],
        verkocht: verkocht || [],
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="grid grid-cols-3 gap-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Calendar className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-2xl font-bold">{data?.todayCount || 0}</p><p className="text-xs text-muted-foreground">Afleveringen vandaag</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Calendar className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-2xl font-bold">{data?.weekCount || 0}</p><p className="text-xs text-muted-foreground">Komende 7 dagen</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-2xl font-bold">{data?.ingeschreven?.length || 0}</p><p className="text-xs text-muted-foreground">Ingeschreven (wacht aflevering)</p></div>
          </CardContent>
        </Card>
      </div>

      {data?.todayAppts && data.todayAppts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Afleveringen vandaag</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.todayAppts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{a.customername || 'Onbekend'}</span>
                  {a.vehiclebrand && <span className="text-muted-foreground ml-2">— {a.vehiclebrand} {a.vehiclemodel || ''}</span>}
                </div>
                <Badge variant="outline">{format(new Date(a.starttime), 'HH:mm', { locale: nl })}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
