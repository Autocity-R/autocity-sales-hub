import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { AsPage, AsCard, AsCardHead } from "@/components/aftersales/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Loader2, Search, FileText, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_TARIEVEN, Niveau, Reparatie, WerkplaatsModel, WerkplaatsTarieven,
  berekenArbeid, eur, fetchModellen, fetchReparaties, fetchTarieven, findMerkFactor,
  inclBtw, uren as urenFmt, urenVoorNiveau,
} from "@/services/werkplaatsPrijsService";

const WerkplaatsPrijslijst: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tarieven, setTarieven] = useState<WerkplaatsTarieven>(DEFAULT_TARIEVEN);
  const [reparaties, setReparaties] = useState<Reparatie[]>([]);
  const [modellen, setModellen] = useState<WerkplaatsModel[]>([]);

  const [merk, setMerk] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [plate, setPlate] = useState("");
  const [plateBusy, setPlateBusy] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("alle");

  useEffect(() => {
    (async () => {
      try {
        const [t, r, m] = await Promise.all([fetchTarieven(), fetchReparaties(), fetchModellen()]);
        setTarieven(t); setReparaties(r); setModellen(m);
      } catch (e: any) {
        toast({ title: "Laden mislukt", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const merkFactor = useMemo(() => findMerkFactor(modellen, merk, model), [modellen, merk, model]);

  const zoekKenteken = async () => {
    const p = plate.trim().toUpperCase().replace(/[-\s]/g, "");
    if (!p) return;
    setPlateBusy(true);
    try {
      const { data } = await (supabase as any)
        .from("vehicles")
        .select("brand, model, license_number")
        .ilike("license_number", `%${p}%`)
        .limit(1);
      const v = data?.[0];
      if (!v) { toast({ title: "Geen auto gevonden met dit kenteken" }); return; }
      const brandMatch = merken.find((m) => m.toLowerCase() === String(v.brand ?? "").toLowerCase());
      if (!brandMatch) {
        toast({ title: `${v.brand} ${v.model} gevonden`, description: "Merk staat niet in de prijsdatabase — kies handmatig." });
        return;
      }
      setMerk(brandMatch);
      const modelMatch = modellen.find(
        (m) => m.merk === brandMatch &&
          (m.model.toLowerCase() === String(v.model ?? "").toLowerCase() ||
            String(v.model ?? "").toLowerCase().includes(m.model.toLowerCase())),
      );
      if (modelMatch) {
        setModel(modelMatch.model);
        toast({ title: `${v.brand} ${modelMatch.model} geselecteerd` });
      } else {
        setModel("");
        toast({ title: `${v.brand} gevonden`, description: `Model "${v.model}" staat niet in de lijst — kies handmatig.` });
      }
    } finally {
      setPlateBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return reparaties.filter((r) => {
      if (cat !== "alle" && r.categorie !== cat) return false;
      if (!s) return true;
      return `${r.reparatie} ${r.categorie} ${r.code}`.toLowerCase().includes(s);
    });
  }, [reparaties, q, cat]);

  const naarFactuur = (r: Reparatie, niveau: Niveau) => {
    const u = urenVoorNiveau(r, niveau);
    const amount = berekenArbeid(u, tarieven.uurtarief_ex_btw, merkFactor);
    navigate("/werkplaats/facturen", {
      state: {
        prefillLine: {
          description: `${r.reparatie}${merk ? ` — ${merk}${model ? ` ${model}` : ""}` : ""} (${urenFmt(u)} arbeid)`,
          amount,
          uren: u,
          tarief: tarieven.uurtarief_ex_btw,
          merk_factor: merkFactor,
          merk, model, niveau,
        },
      },
    });
  };

  const Prijs: React.FC<{ r: Reparatie; niveau: Niveau; highlight?: boolean }> = ({ r, niveau, highlight }) => {
    const u = urenVoorNiveau(r, niveau);
    const ex = berekenArbeid(u, tarieven.uurtarief_ex_btw, merkFactor);
    return (
      <div
        className={`rounded-lg border px-3 py-2 ${
          highlight ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-900"
        }`}
      >
        <div className={`text-[10px] uppercase tracking-wide font-semibold ${highlight ? "text-slate-300" : "text-slate-500"}`}>
          {niveau === "standaard" ? "Adviesprijs" : niveau}
        </div>
        <div className="text-[15px] font-semibold tabular-nums">{eur(ex)}</div>
        <div className={`text-[11px] tabular-nums ${highlight ? "text-slate-300" : "text-slate-500"}`}>
          {eur(inclBtw(ex))} incl. btw · {urenFmt(u)}
        </div>
        <Button
          size="sm"
          variant={highlight ? "secondary" : "outline"}
          className="mt-2 w-full h-8 text-[12px]"
          onClick={() => naarFactuur(r, niveau)}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />Naar factuur
        </Button>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Prijslijst werkplaats</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Marktconforme normuren × uurtarief × merkfactor. Alle bedragen zijn <strong>arbeid, excl. onderdelen</strong>.
          </p>
        </div>

        <AsCard className="mb-4">
          <AsCardHead icon={<Calculator className="h-4 w-4" />} tone="teal" title="Auto" subtitle="Kies merk en model of zoek op kenteken" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Merk</Label>
              <Select value={merk} onValueChange={(v) => { setMerk(v); setModel(""); }}>
                <SelectTrigger><SelectValue placeholder="Kies merk" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {merken.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Model</Label>
              <Select value={model} onValueChange={setModel} disabled={!merk}>
                <SelectTrigger><SelectValue placeholder={merk ? "Kies model" : "Eerst merk"} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {modellenVanMerk.map((m) => (
                    <SelectItem key={m.id} value={m.model}>{m.model} · ×{Number(m.merk_factor).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Kenteken uit systeem</Label>
              <div className="flex gap-2">
                <Input
                  value={plate}
                  placeholder="XX-999-X"
                  onChange={(e) => setPlate(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && zoekKenteken()}
                />
                <Button variant="outline" onClick={zoekKenteken} disabled={plateBusy}>
                  {plateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Berekening</Label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                Uurtarief <strong>{eur(tarieven.uurtarief_ex_btw)}</strong> · merkfactor{" "}
                <strong>×{merkFactor.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </AsCard>

        <AsCard>
          <AsCardHead
            icon={<Calculator className="h-4 w-4" />} tone="teal" title="Reparaties"
            subtitle="Zoek op naam, code of categorie" count={filtered.length}
          />
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-8" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="md:w-64"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="alle">Alle categorieën</SelectItem>
                {categorieen.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="p-8 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Laden…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-slate-400">Geen reparaties gevonden.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <div key={r.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span className="text-[13.5px] font-semibold text-slate-900">{r.reparatie}</span>
                    <Badge variant="secondary" className="text-[10.5px]">{r.categorie}</Badge>
                    <span className="font-mono text-[11px] text-slate-400">{r.code}</span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Info className="h-3 w-3" /> excl. onderdelen
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Prijs r={r} niveau="laag" />
                    <Prijs r={r} niveau="standaard" highlight />
                    <Prijs r={r} niveau="hoog" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AsCard>
      </AsPage>
    </DashboardLayout>
  );
};

export default WerkplaatsPrijslijst;
