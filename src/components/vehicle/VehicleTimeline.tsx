import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, History } from "lucide-react";
import {
  CATEGORIE_LABELS, CATEGORIE_VOLGORDE, TijdlijnCategorie, TijdlijnEvent,
  filterOpCategorie, formatEventTs, groupPerDag, dagenTussen, nlDateSafe,
} from "@/lib/tijdlijn";

const PAGINA = 50;

export interface VehicleTimelineProps {
  vehicleId: string;
  /** Voor de samenvatting bovenaan (allemaal optioneel). */
  createdAt?: string | null;
  soldDate?: string | null;
  deliveryDate?: string | null;
}

/**
 * Volledige historie-tijdlijn per auto (BOUWSTAP 13A).
 * Data komt uit de alleen-lezen RPC voertuig_tijdlijn; RLS bepaalt welke bronnen zichtbaar zijn.
 */
export const VehicleTimeline: React.FC<VehicleTimelineProps> = ({ vehicleId, createdAt, soldDate, deliveryDate }) => {
  const [events, setEvents] = useState<TijdlijnEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [filter, setFilter] = useState<TijdlijnCategorie | "alles">("alles");
  const [toonGeannuleerd, setToonGeannuleerd] = useState(false);
  const [limiet, setLimiet] = useState(PAGINA);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setFout(null);
    (async () => {
      const { data, error } = await (supabase as any).rpc("voertuig_tijdlijn", {
        p_vehicle_id: vehicleId,
        p_toon_geannuleerd: toonGeannuleerd,
      });
      if (cancel) return;
      if (error) setFout(error.message);
      else setEvents((data as TijdlijnEvent[]) || []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [vehicleId, toonGeannuleerd]);

  const aanwezig = useMemo(() => {
    const set = new Set(events.map(e => e.categorie));
    return CATEGORIE_VOLGORDE.filter(c => set.has(c));
  }, [events]);

  const gefilterd = useMemo(() => filterOpCategorie(events, filter), [events, filter]);
  const groepen = useMemo(() => groupPerDag(gefilterd.slice(0, limiet)), [gefilterd, limiet]);

  const dagenInVoorraad = useMemo(() => {
    if (!createdAt) return null;
    return dagenTussen(createdAt, soldDate || new Date().toISOString());
  }, [createdAt, soldDate]);

  return (
    <div className="space-y-4">
      {/* Samenvatting */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-slate-600">
        {createdAt && <span>Binnen sinds <strong className="text-slate-900">{formatEventTs(createdAt, false)}</strong></span>}
        {dagenInVoorraad !== null && <span>Dagen in voorraad <strong className="text-slate-900">{dagenInVoorraad}</strong></span>}
        {soldDate && <span>Verkocht op <strong className="text-slate-900">{formatEventTs(soldDate, false)}</strong></span>}
        {deliveryDate && <span>Afgeleverd op <strong className="text-slate-900">{nlDateSafe(deliveryDate)}</strong></span>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["alles", ...aanwezig] as const).map(c => (
          <Button
            key={c}
            size="sm"
            variant={filter === c ? "default" : "outline"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setFilter(c as TijdlijnCategorie | "alles")}
          >
            {c === "alles" ? "Alles" : CATEGORIE_LABELS[c as TijdlijnCategorie]}
          </Button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            className="accent-slate-700"
            checked={toonGeannuleerd}
            onChange={e => setToonGeannuleerd(e.target.checked)}
          />
          Toon geannuleerd
        </label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-6"><Loader2 className="h-4 w-4 animate-spin" /> Historie laden…</div>
      ) : fout ? (
        <div className="text-sm text-red-600 py-4">Historie kon niet geladen worden: {fout}</div>
      ) : groepen.length === 0 ? (
        <div className="text-sm text-slate-400 py-6 flex items-center gap-2"><History className="h-4 w-4" /> Nog geen gebeurtenissen gevonden.</div>
      ) : (
        <div className="space-y-5">
          {groepen.map(g => (
            <div key={g.key}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1 mb-2">{g.kop}</div>
              <div className="space-y-1.5">
                {g.events.map((e, i) => (
                  <div key={`${e.bron_tabel}-${e.bron_id}-${e.type}-${i}`} className="flex items-start gap-3 text-[13px]">
                    <div className="w-[108px] shrink-0 tabular-nums text-slate-500 pt-px">
                      {formatEventTs(e.ts, e.heeft_tijd)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-900">{e.titel}</span>
                      {e.door_naam && <span className="text-slate-500"> · door {e.door_naam}</span>}
                      {e.via_ander_record && (
                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 align-middle">via ander record</Badge>
                      )}
                      {e.detail && <div className="text-xs text-slate-500 mt-0.5 break-words">{e.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {gefilterd.length > limiet && (
            <Button size="sm" variant="outline" onClick={() => setLimiet(l => l + PAGINA)}>
              Toon meer ({gefilterd.length - limiet} resterend)
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleTimeline;
