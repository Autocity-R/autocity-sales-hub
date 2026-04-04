import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Truck, FileText, ShieldCheck, CreditCard, Package, Download, DollarSign, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface VehicleRow {
  id: string;
  import_status: string | null;
  status: string | null;
  details: any;
  created_at: string | null;
  goedgekeurd_at: string | null;
  bpm_betaald_at: string | null;
  aangekomen_at: string | null;
  aanvraag_ontvangen_at: string | null;
  ingeschreven_at: string | null;
  brand: string | null;
  model: string | null;
  license_number: string | null;
  vin: string | null;
  supplier_id: string | null;
}

type PipelineStep = 'nieuw' | 'betaald' | 'pickup' | 'aangekomen' | 'import' | 'ingeschreven' | 'b2b_papieren';

const PIPELINE_STEPS: { key: PipelineStep; label: string; icon: React.ElementType }[] = [
  { key: 'nieuw', label: 'Nieuw — wacht betaling', icon: DollarSign },
  { key: 'betaald', label: 'Betaald — pickup gereed maken', icon: Package },
  { key: 'pickup', label: 'Pickup gereed / onderweg', icon: Truck },
  { key: 'aangekomen', label: 'Aangekomen — CMR versturen', icon: FileText },
  { key: 'import', label: 'Import in behandeling', icon: ShieldCheck },
  { key: 'ingeschreven', label: 'Ingeschreven ✓', icon: CheckCircle },
  { key: 'b2b_papieren', label: 'B2B papieren verwacht', icon: FileText },
];

const DAY = 86400000;

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY);
}

function isTruthy(val: any): boolean {
  return val === true || val === 'true';
}

function vehicleLabel(v: VehicleRow): string {
  const parts = [v.brand, v.model].filter(Boolean).join(' ');
  return parts ? `${parts} ${v.license_number || v.vin || ''}`.trim() : v.id.slice(0, 8);
}

function classifyVehicle(v: VehicleRow): PipelineStep | null {
  const d = v.details || {};
  const importStatus = v.import_status || 'niet_gestart';
  const isTradeIn = isTruthy(d.isTradeIn);
  const isLoanCar = isTruthy(d.isLoanCar);
  const isDelivered = v.status === 'afgeleverd';

  if (isTradeIn || isLoanCar || isDelivered) return null;

  const purchasePayment = d.purchase_payment_status || d.paymentStatus;
  const paid = purchasePayment === 'volledig_betaald';
  const pickupSent = isTruthy(d.pickupDocumentSent);
  const cmrSent = isTruthy(d.cmrSent);
  const papersReceived = isTruthy(d.papersReceived);

  // B2B papieren
  if (v.status === 'verkocht_b2b' && !papersReceived && d.transportStatus === 'aangekomen') return 'b2b_papieren';

  // Ingeschreven
  if (importStatus === 'ingeschreven') return 'ingeschreven';

  // Import in behandeling
  if (['aanvraag_ontvangen', 'goedgekeurd', 'bpm_betaald'].includes(importStatus)) return 'import';

  // Aangekomen - CMR versturen
  if (d.transportStatus === 'aangekomen' && !cmrSent && !papersReceived) return 'aangekomen';
  if (d.transportStatus === 'aangekomen') return 'import'; // aangekomen but CMR done

  // Onderweg
  if (d.transportStatus === 'onderweg') return 'pickup';

  // Pickup gereed — betaald + pickup doc verstuurd maar nog niet onderweg/aangekomen
  if (paid && pickupSent && d.transportStatus !== 'onderweg' && d.transportStatus !== 'aangekomen') return 'pickup';

  // Betaald - pickup document nog niet verstuurd
  if (paid && !pickupSent && d.transportStatus !== 'onderweg' && d.transportStatus !== 'aangekomen') return 'betaald';

  // Nieuw - wacht betaling (inclusief NULL/undefined)
  if (!paid) return 'nieuw';

  return null;
}

function urgencyScore(v: VehicleRow, step: PipelineStep): number {
  const d = v.details || {};
  const daysInSystem = daysSince(v.created_at);
  const statusWeights: Record<PipelineStep, number> = {
    nieuw: 2, betaald: 1.5, pickup: 1, aangekomen: 3, import: 2, ingeschreven: 0.5, b2b_papieren: 2,
  };
  return Math.round(daysInSystem * (statusWeights[step] || 1));
}

export const MarcoDashboard: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<PipelineStep | null>(null);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['marco-dashboard-v2'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, import_status, status, details, created_at, goedgekeurd_at, bpm_betaald_at, aangekomen_at, aanvraag_ontvangen_at, ingeschreven_at, brand, model, license_number, vin, supplier_id')
        .neq('status', 'afgeleverd');
      if (error) throw error;
      return (data || []) as VehicleRow[];
    },
    refetchInterval: 60000,
  });

  const { data: contacts } = useQuery({
    queryKey: ['marco-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, company_name, first_name, last_name, email, phone')
        .eq('type', 'leverancier');
      if (error) throw error;
      return data || [];
    },
  });

  const contactMap = useMemo(() => {
    const m: Record<string, any> = {};
    (contacts || []).forEach(c => { m[c.id] = c; });
    return m;
  }, [contacts]);

  const processed = useMemo(() => {
    if (!vehicles) return null;

    const filtered = vehicles.filter(v => {
      const d = v.details || {};
      return d.isTradeIn !== true && d.isTradeIn !== 'true' && !d.isLoanCar;
    });

    const pipeline: Record<PipelineStep, VehicleRow[]> = {
      nieuw: [], betaald: [], pickup: [], aangekomen: [], import: [], ingeschreven: [], b2b_papieren: [],
    };

    filtered.forEach(v => {
      const step = classifyVehicle(v);
      if (step) pipeline[step].push(v);
    });

    // Sort each by urgency
    Object.keys(pipeline).forEach(key => {
      const k = key as PipelineStep;
      pipeline[k].sort((a, b) => urgencyScore(b, k) - urgencyScore(a, k));
    });

    // Alert counts
    const now = Date.now();
    const alerts = {
      nietBetaald: pipeline.nieuw.length,
      cmrKritiek: pipeline.aangekomen.length,
      bpmTeLaat: filtered.filter(v => {
        return v.import_status === 'goedgekeurd' && v.goedgekeurd_at && (now - new Date(v.goedgekeurd_at).getTime()) / DAY > 7;
      }).length,
      inschrijvingTeLaat: filtered.filter(v => {
        return v.import_status === 'bpm_betaald' && v.bpm_betaald_at && (now - new Date(v.bpm_betaald_at).getTime()) / DAY > 5;
      }).length,
      pickupGereed: filtered.filter(v => {
        const d = v.details || {};
        const paid = (d.purchase_payment_status || d.paymentStatus) === 'volledig_betaald';
        return paid && isTruthy(d.pickupDocumentSent) && d.transportStatus !== 'onderweg' && d.transportStatus !== 'aangekomen';
      }).length,
    };

    return { pipeline, alerts, total: filtered.length };
  }, [vehicles]);

  const activeVehicles = useMemo(() => {
    if (!processed || !selectedStep) return [];
    return processed.pipeline[selectedStep] || [];
  }, [processed, selectedStep]);

  const downloadCSV = (rows: VehicleRow[], filename: string) => {
    const headers = ['Merk', 'Model', 'Kenteken', 'VIN', 'Leverancier', 'Email leverancier', 'Dagen sinds inkoop', 'Import status', 'Betaald', 'CMR verstuurd', 'Papieren ontvangen'];
    const csvRows = rows.map(v => {
      const d = v.details || {};
      const supplier = v.supplier_id ? contactMap[v.supplier_id] : null;
      const paymentStatus = d.purchase_payment_status || d.paymentStatus;
      return [
        v.brand || '', v.model || '', v.license_number || '', v.vin || '',
        supplier?.company_name || supplier?.first_name || '',
        supplier?.email || '',
        daysSince(v.created_at),
        v.import_status || '',
        paymentStatus === 'volledig_betaald' ? 'Ja' : 'Nee',
        isTruthy(d.cmrSent) ? 'Ja' : 'Nee',
        isTruthy(d.papersReceived) ? 'Ja' : 'Nee',
      ].join(';');
    });
    const csv = [headers.join(';'), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="grid grid-cols-5 gap-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (!processed) return null;

  const alertTiles = [
    { count: processed.alerts.nietBetaald, label: 'Nog te betalen aan leverancier', color: 'bg-red-500', icon: DollarSign },
    { count: processed.alerts.cmrKritiek, label: 'CMR kritiek — geen papieren zonder CMR', color: 'bg-red-500', icon: FileText },
    { count: processed.alerts.bpmTeLaat, label: 'BPM te laat — loopt achter', color: 'bg-amber-500', icon: Clock },
    { count: processed.alerts.inschrijvingTeLaat, label: 'Inschrijving te laat', color: 'bg-amber-500', icon: CreditCard },
    { count: processed.alerts.pickupGereed, label: 'Klaar voor ophalen', color: 'bg-blue-500', icon: Package },
  ];

  const stepColors: Record<PipelineStep, string> = {
    nieuw: 'border-red-500 bg-red-500/10',
    betaald: 'border-orange-500 bg-orange-500/10',
    pickup: 'border-blue-500 bg-blue-500/10',
    aangekomen: 'border-red-400 bg-red-400/10',
    import: 'border-orange-400 bg-orange-400/10',
    ingeschreven: 'border-green-500 bg-green-500/10',
    b2b_papieren: 'border-orange-500 bg-orange-500/10',
  };

  const stepTextColors: Record<PipelineStep, string> = {
    nieuw: 'text-red-500',
    betaald: 'text-orange-500',
    pickup: 'text-blue-500',
    aangekomen: 'text-red-400',
    import: 'text-orange-400',
    ingeschreven: 'text-green-500',
    b2b_papieren: 'text-orange-500',
  };

  return (
    <div className="space-y-4">
      {/* Alert tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {alertTiles.map((tile, i) => (
          <Card key={i} className={cn("border-l-4", tile.count > 0 ? `border-l-${tile.color.replace('bg-', '')}` : 'border-l-muted')}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", tile.count > 0 ? `${tile.color}/10` : 'bg-muted')}>
                <tile.icon className={cn("h-5 w-5", tile.count > 0 ? 'text-white' : 'text-muted-foreground')} style={tile.count > 0 ? { color: tile.color.includes('red') ? '#ef4444' : tile.color.includes('amber') ? '#f59e0b' : '#3b82f6' } : {}} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{tile.count}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{tile.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" />
            Importproces Pipeline — {processed.total} auto's actief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {PIPELINE_STEPS.map(({ key, label, icon: Icon }) => {
              const count = processed.pipeline[key].length;
              const isSelected = selectedStep === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedStep(isSelected ? null : key)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-left transition-all hover:shadow-md",
                    isSelected ? `${stepColors[key]} border-2 shadow-md` : 'border-border hover:border-muted-foreground/30',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={cn("h-4 w-4", stepTextColors[key])} />
                    {isSelected && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action list */}
      {selectedStep && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {PIPELINE_STEPS.find(s => s.key === selectedStep)?.label} — {activeVehicles.length} auto's
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => downloadCSV(activeVehicles, `marco-${selectedStep}`)}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            {activeVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Geen auto's in deze stap</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Auto</th>
                      <th className="pb-2 pr-3 font-medium">Leverancier</th>
                      <th className="pb-2 pr-3 font-medium text-center">Dagen</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pr-3 font-medium text-center">Betaald</th>
                      <th className="pb-2 pr-3 font-medium text-center">CMR</th>
                      <th className="pb-2 pr-3 font-medium text-center">Papieren</th>
                      <th className="pb-2 font-medium text-center">Urgentie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeVehicles.map(v => {
                      const d = v.details || {};
                      const supplier = v.supplier_id ? contactMap[v.supplier_id] : null;
                      const paymentStatus = d.purchase_payment_status || d.paymentStatus;
                      const paid = paymentStatus === 'volledig_betaald';
                      const days = daysSince(v.created_at);
                      const urg = urgencyScore(v, selectedStep);

                      return (
                        <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 pr-3">
                            <p className="font-medium">{v.brand} {v.model}</p>
                            <p className="text-xs text-muted-foreground">{v.license_number || v.vin || '—'}</p>
                          </td>
                          <td className="py-2 pr-3 text-xs">{supplier?.company_name || supplier?.first_name || '—'}</td>
                          <td className="py-2 pr-3 text-center">
                            <span className={cn("font-medium", days > 30 ? 'text-red-500' : days > 14 ? 'text-amber-500' : '')}>{days}d</span>
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className="text-[10px]">{v.import_status || 'niet_gestart'}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-center">
                            {paid ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-red-500 text-xs font-medium">Nee</span>}
                          </td>
                          <td className="py-2 pr-3 text-center">
                            {isTruthy(d.cmrSent) ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="py-2 pr-3 text-center">
                            {isTruthy(d.papersReceived) ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="py-2 text-center">
                            <Badge className={cn("text-[10px]", urg > 60 ? 'bg-red-500' : urg > 30 ? 'bg-amber-500' : 'bg-blue-500')} variant="default">{urg}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
