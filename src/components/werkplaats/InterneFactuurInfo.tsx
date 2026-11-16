import React from "react";
import { Timer, Package, ShieldCheck } from "lucide-react";
import { AsCard, AsCardHead } from "@/components/aftersales/ui";
import { fmtUren } from "@/lib/tijdregels";
import { bronLabel, urenPerPersoon, type WerkorderDetail } from "@/lib/factuurWerkorders";

/** Ter info in het interne factuurvenster: bron, claim, gewerkte tijd en gekoppelde onderdelen. Geen uurtarief. */
export const InterneFactuurInfo: React.FC<{ detail: WerkorderDetail | null }> = ({ detail }) => {
  if (!detail) return null;
  const uren = urenPerPersoon(detail);
  const naam = (id: string | null) => (id ? detail.namen?.[id] || "Onbekend" : "Niet toegewezen");
  return (
    <AsCard>
      <AsCardHead icon={<Timer className="h-4 w-4" />} tone="slate" title="Ter info" subtitle="Er wordt geen uurtarief berekend" />
      <div className="p-4 space-y-3 text-[13px]">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
          <span>Bron: <span className="font-medium">{bronLabel(detail)}</span></span>
          {detail.claim_nummer && (
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Claim <span className="font-medium">{detail.claim_nummer}</span></span>
          )}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
            Gewerkte tijd {uren.perTijdregel ? "(per persoon)" : ""}
          </div>
          {uren.regels.map((r, i) => (
            <div key={i} className="flex justify-between"><span>{naam(r.persoon)}</span><span className="tabular-nums">{fmtUren(r.seconden)}</span></div>
          ))}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1 flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />Gekoppelde onderdelen
          </div>
          {detail.onderdelen?.length ? detail.onderdelen.map(p => (
            <div key={p.id} className="flex justify-between gap-2">
              <span className="truncate">{p.aantal && p.aantal > 1 ? `${p.aantal}× ` : ""}{p.part_name || "Onderdeel"}</span>
              <span className="text-slate-500">{p.status || ""}</span>
            </div>
          )) : <div className="text-slate-400">Geen onderdelen gekoppeld</div>}
        </div>
      </div>
    </AsCard>
  );
};

export default InterneFactuurInfo;
