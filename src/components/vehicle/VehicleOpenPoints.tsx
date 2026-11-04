import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ClaimNumber } from '@/components/warranty/ClaimNumber';
import { formatEventTs } from '@/lib/tijdlijn';
import { VehicleOpenPoint, isOpenPointLate, openGroup, openStatus, sortOpenPoints } from '@/lib/vehicleOpenPoints';

export function VehicleOpenPoints({ vehicleId }: { vehicleId: string }) {
  const [points, setPoints] = useState<VehicleOpenPoint[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    supabase.rpc('voertuig_open_punten', { p_vehicle_id: vehicleId }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setError(error.message);
      else setPoints(sortOpenPoints((data || []) as unknown as VehicleOpenPoint[]));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [vehicleId]);
  const groups = new Map<string, VehicleOpenPoint[]>();
  for (const p of points) { const label = openGroup(p.groep); const list = groups.get(label) || []; list.push(p); groups.set(label, list); }
  return <section className="space-y-3 border-b border-border pb-4">
    <h3 className="font-semibold">Nog open ({points.length})</h3>
    {loading ? <p className="text-sm text-muted-foreground">Open punten laden…</p> : error ? <p className="text-sm text-destructive">Open punten niet beschikbaar: {error}</p> : !points.length ? <p className="text-sm text-muted-foreground">Niets open op deze auto ✓</p> : [...groups].map(([group, items]) => <div key={group}>
      <h4 className="text-sm font-medium mb-1">{group}</h4>
      <ul className="space-y-2">{items.map(p => <li key={`${p.soort}-${p.id}`} className="text-sm border-l-2 border-border pl-3">
        <div className="flex flex-wrap items-center gap-2"><span>{p.omschrijving || '—'}</span><Badge variant="outline">{openStatus(p.status)}</Badge>{isOpenPointLate(p) && <Badge variant="destructive">te laat</Badge>}{p.claim_nummer && <ClaimNumber number={p.claim_nummer} />}{p.via_ander_record && <Badge variant="outline">via ander record</Badge>}</div>
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
          {p.planned_at && Number.isFinite(Date.parse(p.planned_at)) && <span>Ingepland: {formatEventTs(p.planned_at, true)}</span>}
          {p.ordered_at && <span>Besteld: {formatEventTs(p.ordered_at, true)}</span>}
          {p.assigned_name && <span>Toegewezen: {p.assigned_name}</span>}
          {p.due_date && <span>Deadline: {formatEventTs(p.due_date, p.due_date.length > 10)}</span>}
        </div>
      </li>)}</ul>
    </div>)}
  </section>;
}