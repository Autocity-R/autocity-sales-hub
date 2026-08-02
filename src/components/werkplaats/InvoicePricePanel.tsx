import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Plus, Search } from "lucide-react";
import {
  Niveau, Reparatie, WerkplaatsModel,
  berekenArbeid, eur, inclBtw, uren as urenFmt, urenVoorNiveau,
} from "@/services/werkplaatsPrijsService";

export interface PriceAddPayload {
  reparatie: Reparatie;
  niveau: Niveau;
  uren: number;
  tarief: number;
  factor: number;
}

interface Props {
  reparaties: Reparatie[];
  modellen: WerkplaatsModel[];
  /** Merk/model komen automatisch mee van de gekozen auto, maar zijn hier bij te stellen. */
  merk: string;
  model: string;
  onMerkChange: (v: string) => void;
  onModelChange: (v: string) => void;
  merkFactor: number;
  uurtarief: number;
  onAdd: (p: PriceAddPayload) => void;
}

const NIVEAUS: Niveau[] = ["laag", "standaard", "hoog"];

/** Spiek-paneel: marktconforme normuren opzoeken zonder de factuurpagina te verlaten. */
const InvoicePricePanel: React.FC<Props> = ({
  reparaties, modellen, merk, model, onMerkChange, onModelChange, merkFactor, uurtarief, onAdd,
}) => {
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("alle");

  const merken = useMemo(
    () => Array.from(new Set(modellen.map((m) => m.merk))).sort((a, b) => a.localeCompare(b)),
    [modellen],
  );
  const modellenVanMerk = useMemo(
    () => modellen.filter((m) => m.merk === merk).sort((a, b) => a.model.localeCompare(b.model)),
    [modellen, merk],
  );
  const categorieen = useMemo(
    () => Array.from(new Set(reparaties.map((r) => r.categorie))).sort((a, b) => a.localeCompare(b)),
    [reparaties],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return reparaties
      .filter((r) => (cat === "alle" || r.categorie === cat) &&
        (!s || `${r.reparatie} ${r.categorie} ${r.code}`.toLowerCase().includes(s)))
      .slice(0, 60);
  }, [reparaties, q, cat]);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-[13px] font-semibold text-amber-900">💡 Prijslijst — marktconforme normuren</span>
        {open ? <ChevronUp className="h-4 w-4 text-amber-800" /> : <ChevronDown className="h-4 w-4 text-amber-800" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Select value={merk} onValueChange={(v) => { onMerkChange(v); onModelChange(""); }}>
              <SelectTrigger className="bg-white h-9 text-[12.5px]"><SelectValue placeholder="Merk" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {merken.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={onModelChange} disabled={!merk}>
              <SelectTrigger className="bg-white h-9 text-[12.5px]"><SelectValue placeholder={merk ? "Model" : "Eerst merk"} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {modellenVanMerk.map((m) => (
                  <SelectItem key={m.id} value={m.model}>{m.model} · ×{Number(m.merk_factor).toFixed(2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-8 bg-white h-9 text-[12.5px]"
                placeholder="Zoek reparatie…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="bg-white h-9 text-[12.5px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="alle">Alle categorieën</SelectItem>
                {categorieen.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="text-[11px] text-amber-900/80">
            Uurtarief {eur(uurtarief)} · merkfactor ×{merkFactor.toFixed(2)} · alle prijzen zijn arbeid, <strong>excl. onderdelen</strong>
          </div>

          <div className="max-h-[380px] overflow-y-auto rounded-lg border border-amber-200 bg-white divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-[12.5px] text-slate-400">Geen reparaties gevonden.</div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-[12.5px] font-semibold text-slate-900">{r.reparatie}</span>
                    <Badge variant="secondary" className="text-[10px]">{r.categorie}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {NIVEAUS.map((n) => {
                      const u = urenVoorNiveau(r, n);
                      const ex = berekenArbeid(u, uurtarief, merkFactor);
                      const hi = n === "standaard";
                      return (
                        <div
                          key={n}
                          className={`rounded-md border px-2 py-1.5 ${hi ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50"}`}
                        >
                          <div className={`text-[9.5px] uppercase font-semibold tracking-wide ${hi ? "text-slate-300" : "text-slate-500"}`}>
                            {hi ? "advies" : n}
                          </div>
                          <div className="text-[13px] font-semibold tabular-nums">{eur(ex)}</div>
                          <div className={`text-[10px] tabular-nums ${hi ? "text-slate-300" : "text-slate-500"}`}>
                            {eur(inclBtw(ex))} incl. · {urenFmt(u)}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={hi ? "secondary" : "outline"}
                            className="mt-1.5 w-full h-7 text-[11px]"
                            onClick={() => onAdd({ reparatie: r, niveau: n, uren: u, tarief: uurtarief, factor: merkFactor })}
                          >
                            <Plus className="h-3 w-3 mr-0.5" />Toevoegen
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePricePanel;