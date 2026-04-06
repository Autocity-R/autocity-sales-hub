import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Zap, Phone, Calendar, ChevronDown, CheckCircle, Clock, Wrench } from "lucide-react";
import { format, differenceInDays, startOfDay, endOfDay, addDays } from "date-fns";
import { nl } from "date-fns/locale";

interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedByName?: string;
}

interface DeliveryVehicle {
  id: string;
  brand: string;
  model: string;
  license: string;
  importStatus: string | null;
  soldDate: string;
  daysWaiting: number;
  checklist: ChecklistItem[];
  checklistDone: number;
  checklistTotal: number;
  openItems: string[];
  doneItems: string[];
  complexity: "laag" | "middel" | "hoog";
  canDeliver: boolean;
  blocker: string | null;
  salesperson: string;
  hasDeliveryAppointment: boolean;
  deliveryAppointmentId: string | null;
}

const SIMPLE_PATTERNS = /beurt|apk|opladen|volle tank|schoonmaken|wassen|tanken|sleutel|klaar/i;
const COMPLEX_PATTERNS = /uitdeuk|spotrepair|herstel|spuit|onderdeel|bestellen|plaatsen|restyle|deuk|lak/i;

function classifyComplexity(items: ChecklistItem[]): "laag" | "middel" | "hoog" {
  const openItems = items.filter(i => !i.completed);
  if (openItems.length === 0) return "laag";
  
  const hasComplex = openItems.some(i => COMPLEX_PATTERNS.test(i.description));
  const allSimple = openItems.every(i => SIMPLE_PATTERNS.test(i.description));
  
  if (allSimple && openItems.length <= 3) return "laag";
  if (hasComplex && openItems.length > 2) return "hoog";
  if (hasComplex) return "middel";
  return openItems.length <= 3 ? "laag" : "middel";
}

const PROFILES_MAP: Record<string, string> = {
  "9f42b4f5-6e01-43e4-87d3-f372e1b4c909": "Daan Leyte",
  "3be626db-ad93-4236-9e9f-e0ab14690f42": "Alexander Kool",
  "6d62becf-fa32-4eb6-9fb2-936ecfe4313f": "Hendrik",
  "fe095518-9c0a-4435-b097-5b91ca8be586": "Martijn Zuyderhoudt",
  "ddcad8f3-5522-477a-a613-7d35094306a5": "Mario Kroon",
  "37eb30a7-e034-4315-8d1b-c2f61d2535a3": "Lloyd Mahabier",
};

function getComplexityBadge(c: string) {
  switch (c) {
    case "laag": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Snel klaar</Badge>;
    case "middel": return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Gemiddeld</Badge>;
    case "hoog": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Veel werk</Badge>;
  }
}

export const LisaDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['lisa-dashboard-v2'],
    queryFn: async () => {
      const today = new Date();
      const weekFromNow = addDays(today, 7);

      const [vehiclesRes, appointmentsRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id, brand, model, license_number, import_status, sold_date, sold_by_user_id, status, details')
          .eq('status', 'verkocht_b2c'),
        supabase
          .from('appointments')
          .select('*')
          .eq('type', 'aflevering')
          .neq('status', 'geannuleerd')
          .gte('starttime', startOfDay(today).toISOString())
          .lte('starttime', endOfDay(weekFromNow).toISOString())
          .order('starttime'),
      ]);

      return {
        vehicles: vehiclesRes.data || [],
        appointments: appointmentsRes.data || [],
      };
    },
    refetchInterval: 60000,
  });

  const processed = useMemo(() => {
    if (!data) return null;
    const now = new Date();

    const vehicles: DeliveryVehicle[] = data.vehicles.map((v: any) => {
      const details = v.details || {};
      const checklist: ChecklistItem[] = (details.preDeliveryChecklist || []).map((item: any) => ({
        id: item.id,
        description: item.description || '',
        completed: item.completed === true,
        completedAt: item.completedAt,
        completedByName: item.completedByName,
      }));

      const checklistDone = checklist.filter(i => i.completed).length;
      const checklistTotal = checklist.length;
      const openItems = checklist.filter(i => !i.completed).map(i => i.description);
      const doneItems = checklist.filter(i => i.completed).map(i => i.description);
      const complexity = classifyComplexity(checklist);
      
      const isRegistered = v.import_status === 'ingeschreven';
      const isChecklistComplete = checklistTotal === 0 || checklistDone === checklistTotal;
      const canDeliver = isRegistered && isChecklistComplete;
      
      let blocker: string | null = null;
      if (!isRegistered && !isChecklistComplete) blocker = `Niet ingeschreven + ${checklistTotal - checklistDone} open items`;
      else if (!isRegistered) blocker = "Wacht op kenteken (niet ingeschreven)";
      else if (!isChecklistComplete) blocker = `${checklistTotal - checklistDone} checklist items open`;

      const daysWaiting = v.sold_date ? differenceInDays(now, new Date(v.sold_date)) : 0;
      const salesperson = PROFILES_MAP[v.sold_by_user_id] || "Onbekend";
      
      const hasDeliveryAppointment = !!details.deliveryAppointmentId;

      return {
        id: v.id,
        brand: v.brand || '',
        model: v.model || '',
        license: v.license_number || '—',
        importStatus: v.import_status,
        soldDate: v.sold_date,
        daysWaiting,
        checklist,
        checklistDone,
        checklistTotal,
        openItems,
        doneItems,
        complexity,
        canDeliver,
        blocker,
        salesperson,
        hasDeliveryAppointment,
        deliveryAppointmentId: details.deliveryAppointmentId || null,
      };
    });

    // Sort all by days waiting desc
    vehicles.sort((a, b) => b.daysWaiting - a.daysWaiting);

    const redZone = vehicles.filter(v => v.daysWaiting > 14);
    const quickWins = vehicles.filter(v => 
      !redZone.includes(v) &&
      v.importStatus === 'ingeschreven' &&
      v.checklistTotal > 0 &&
      (v.checklistTotal - v.checklistDone) <= 3 &&
      (v.checklistTotal - v.checklistDone) > 0 &&
      v.complexity !== 'hoog'
    );
    const forgottenCustomers = vehicles.filter(v =>
      v.canDeliver && !v.hasDeliveryAppointment
    );
    
    const todayAppts = data.appointments.filter((a: any) => {
      const d = new Date(a.starttime);
      return d >= startOfDay(now) && d <= endOfDay(now);
    });
    const weekAppts = data.appointments;

    return { vehicles, redZone, quickWins, forgottenCustomers, todayAppts, weekAppts };
  }, [data]);

  if (isLoading || !processed) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard 
          icon={AlertTriangle} 
          iconColor="text-red-500" 
          bgColor="bg-red-500/10"
          value={processed.redZone.length} 
          label="Rode Zone (>14d)" 
        />
        <KPICard 
          icon={Zap} 
          iconColor="text-green-500" 
          bgColor="bg-green-500/10"
          value={processed.quickWins.length} 
          label="Quick Wins" 
        />
        <KPICard 
          icon={Phone} 
          iconColor="text-yellow-500" 
          bgColor="bg-yellow-500/10"
          value={processed.forgottenCustomers.length} 
          label="Verkoper bellen" 
        />
        <KPICard 
          icon={Calendar} 
          iconColor="text-blue-500" 
          bgColor="bg-blue-500/10"
          value={processed.todayAppts.length} 
          label={`Afleveringen vandaag (${processed.weekAppts.length} week)`} 
        />
      </div>

      {/* Red Zone */}
      {processed.redZone.length > 0 && (
        <PrioritySection
          title="RODE ZONE — Klant wacht te lang (>14 dagen)"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          borderColor="border-l-red-500"
          vehicles={processed.redZone}
        />
      )}

      {/* Quick Wins */}
      {processed.quickWins.length > 0 && (
        <PrioritySection
          title="QUICK WINS — Ingeschreven + korte checklist"
          icon={<Zap className="h-4 w-4 text-green-500" />}
          borderColor="border-l-green-500"
          vehicles={processed.quickWins}
        />
      )}

      {/* Forgotten Customers */}
      {processed.forgottenCustomers.length > 0 && (
        <PrioritySection
          title="VERKOPER BELLEN — Klaar maar geen afspraak"
          icon={<Phone className="h-4 w-4 text-yellow-500" />}
          borderColor="border-l-yellow-500"
          vehicles={processed.forgottenCustomers}
          showCallAction
        />
      )}

      {/* Today's appointments */}
      {processed.todayAppts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Afleverafspraken vandaag
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {processed.todayAppts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{a.customername || 'Onbekend'}</span>
                  {a.vehiclebrand && (
                    <span className="text-muted-foreground ml-2">
                      — {a.vehiclebrand} {a.vehiclemodel || ''} ({a.vehiclelicensenumber || ''})
                    </span>
                  )}
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

function KPICard({ icon: Icon, iconColor, bgColor, value, label }: {
  icon: any; iconColor: string; bgColor: string; value: number; label: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PrioritySection({ title, icon, borderColor, vehicles, showCallAction }: {
  title: string; icon: React.ReactNode; borderColor: string; vehicles: DeliveryVehicle[]; showCallAction?: boolean;
}) {
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title} ({vehicles.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {vehicles.map(v => (
          <VehicleRow key={v.id} vehicle={v} showCallAction={showCallAction} />
        ))}
      </CardContent>
    </Card>
  );
}

function VehicleRow({ vehicle: v, showCallAction }: { vehicle: DeliveryVehicle; showCallAction?: boolean }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-left">
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 transition-transform" />
            <span className="font-medium">{v.brand} {v.model}</span>
            <span className="text-muted-foreground">({v.license})</span>
            <span className="text-muted-foreground">— {v.daysWaiting}d</span>
            {v.daysWaiting > 21 && <Badge variant="destructive" className="text-[10px] px-1 py-0">KRITIEK</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {v.checklistTotal > 0 ? (
              <span className="text-xs text-muted-foreground">
                {v.checklistDone}/{v.checklistTotal} {v.checklistDone === v.checklistTotal ? '✅' : ''}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Geen checklist</span>
            )}
            <Badge variant="outline" className="text-[10px]">
              {v.importStatus || 'onbekend'}
            </Badge>
            {getComplexityBadge(v.complexity)}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-7 pb-2 text-xs space-y-1">
          {v.openItems.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Te doen:</span>
              <ul className="ml-3 mt-0.5 space-y-0.5">
                {v.openItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Wrench className="h-3 w-3 text-muted-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {v.doneItems.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Klaar:</span>
              <ul className="ml-3 mt-0.5 space-y-0.5">
                {v.doneItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-muted-foreground line-through">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-4 mt-1 text-muted-foreground">
            <span>Verkoper: <strong className="text-foreground">{v.salesperson}</strong></span>
            {v.blocker && <span className="text-red-500">Blokkade: {v.blocker}</span>}
            {v.hasDeliveryAppointment && <span className="text-blue-500">Afspraak gepland</span>}
            {showCallAction && !v.hasDeliveryAppointment && (
              <span className="text-yellow-600 font-medium">→ Verkoper {v.salesperson} moet bellen</span>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
