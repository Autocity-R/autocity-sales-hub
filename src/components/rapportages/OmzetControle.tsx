import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AsCard, AsPill, AsLicensePlate } from "@/components/aftersales/ui";
import { aansluiting, inPeriod, takTotals, TAK_LABEL, type Tak } from "@/lib/omzet";
import { controle, poetsNogOpMaandfactuur, type OmzetBron } from "@/services/omzetService";

export const eur2 = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n || 0);
const dmy = (s?: string | null) => (s ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" }) : "—");

export const CONTROLE_ROLES = ["owner", "admin", "manager", "operationeel_directeur"];

/** Controle-blok: alleen tonen, niets wijzigen. */
export const OmzetControle: React.FC<{ bron: OmzetBron; van: string; tot: string; label: string }> = ({ bron, van, tot, label }) => {
  const { userRole, isAdmin } = useAuth();
  if (!isAdmin && !CONTROLE_ROLES.includes(userRole || "")) return null;
  const regels = inPeriod(bron.regels, van, tot);
  const a = aansluiting(regels);
  const t = takTotals(regels);
  const c = controle(bron, van, tot);
  const po = poetsNogOpMaandfactuur(bron, van, tot);

  const List: React.FC<{ title: string; empty: string; children: React.ReactNode; n: number }> = ({ title, empty, children, n }) => (
    <div>
      <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-slate-800">{title}<AsPill tone={n ? "amber" : "green"}>{n}</AsPill></div>
      {n === 0 ? <div className="text-[11.5px] text-slate-500">{empty}</div> : <div className="space-y-1">{children}</div>}
    </div>
  );
  const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-700">{children}</div>
  );

  return (
    <AsCard className="p-4" data-testid="omzet-controle">
      <div className="mb-3 text-[13px] font-semibold text-slate-900">Controle — {label}</div>
      <div className={a.sluit ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3" : "rounded-lg border border-red-200 bg-red-50 p-3"}>
        <div className="flex items-center gap-2 text-[12.5px] font-semibold">
          {a.sluit ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
          {a.sluit ? "Aansluiting klopt" : `Verschil: ${eur2(a.verschilTak || a.verschilMedewerker)}`}
        </div>
        <div className="mt-1 grid grid-cols-1 gap-1 text-[11.5px] text-slate-700 sm:grid-cols-2">
          <div>Totaal facturen: <b data-testid="controle-totaal">{eur2(a.totaal)}</b></div>
          <div>{(Object.keys(TAK_LABEL) as Tak[]).map(k => `${TAK_LABEL[k]} ${eur2(t[k])}`).join(" + ")}</div>
          <div>Medewerkers {eur2(a.medewerkers)} + niet toegewezen {eur2(a.nietToegewezen)}</div>
          {po.count > 0 && <div className="text-slate-500">Apart (niet in totaal): poets nog op maandfactuur {po.count} × € 82,64 = {eur2(po.bedrag)}</div>}
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <List title="Losse facturen zonder werkorder" empty="Geen." n={c.losZonderWerkorder.length}>
          {c.losZonderWerkorder.map(r => <Row key={r.invoice_id}><b className="font-mono">{r.invoice_number}</b><span>{r.klant || "—"}</span><span>{eur2(r.subtotal)}</span><span>{TAK_LABEL[r.tak]}</span>{!r.telt_mee && <AsPill tone="slate">telt niet mee</AsPill>}</Row>)}
        </List>
        <List title="Goedgekeurde externe werkorders zonder factuur" empty="Geen." n={c.externZonderFactuur.length}>
          {c.externZonderFactuur.map(o => <Row key={o.id}>{o.kenteken && <AsLicensePlate size="sm" value={o.kenteken} />}<span>{o.klant || "—"}</span><span>{o.discipline === "spuit" ? "Schadeherstel" : "Werkplaats"}</span><span>goedgekeurd {dmy(o.approved_at)}</span></Row>)}
        </List>
        <List title="Handmatige concepten (tellen nog niet mee)" empty="Geen." n={c.conceptenHandmatig.length}>
          {c.conceptenHandmatig.map(i => <Row key={i.id}><b className="font-mono">{i.invoice_number || "concept"}</b><span>{i.customer?.name || "—"}</span><span>{eur2(Number(i.subtotal) || 0)}</span><span>{dmy(i.created_at)}</span></Row>)}
        </List>
        <List title="Facturen die niet meetellen" empty="Geen." n={c.nietMee.length}>
          {c.nietMee.map(i => <Row key={i.id}><b className="font-mono">{i.invoice_number}</b><span>{eur2(Number(i.subtotal) || 0)}</span><span>{i.telt_niet_mee_reden || "—"}</span></Row>)}
        </List>
        {c.poetsZonderUitvoerder.length > 0 && (
          <List title="Afgeronde poetsbeurten zonder uitvoerder (nergens gefactureerd)" empty="Geen." n={c.poetsZonderUitvoerder.length}>
            {c.poetsZonderUitvoerder.map(b => <Row key={b.id}><span>{dmy(b.day)}</span><span className="font-mono text-[10.5px]">{b.id.slice(0, 8)}</span></Row>)}
          </List>
        )}
      </div>
    </AsCard>
  );
};
