import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileCardList, MobileRecordCard } from "@/components/ui/mobile-record-card";
import { AlertTriangle, ArrowUpDown, Download, Search, UserSearch } from "lucide-react";
import {
  REDEN_LABELS,
  Uitlening,
  fetchUitleningen,
  formatNL,
  fromLocalInput,
  isTeLaat,
  leenautoWieReed,
  plateKey,
} from "@/services/leenautoService";
import { fetchLoanCars } from "@/services/loanCarService";

type SortKey = "kenteken" | "klant_naam" | "uitgeleend_op" | "ingeleverd_op" | "reden";
type StatusFilter = "alle" | "open" | "afgesloten" | "te_laat";

const statusOf = (u: Uitlening) => (u.ingeleverd_op ? "afgesloten" : isTeLaat(u) ? "te_laat" : "open");

const StatusBadge = ({ u }: { u: Uitlening }) => {
  const s = statusOf(u);
  if (s === "te_laat") return <Badge variant="destructive">TE LAAT</Badge>;
  if (s === "open") return <Badge variant="secondary">Uitgeleend</Badge>;
  return <Badge variant="outline">Ingeleverd</Badge>;
};

const WieReed: React.FC = () => {
  const [kenteken, setKenteken] = useState("");
  const [datum, setDatum] = useState("");
  const [tijd, setTijd] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Uitlening[] | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const zoek = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null); setWarning(null); setResult(null);
    const moment = fromLocalInput(`${datum}T${tijd || "00:00"}`);
    if (!kenteken.trim() || !moment) { setError("Vul kenteken, datum en tijd in."); return; }
    setBusy(true);
    try {
      const rows = await leenautoWieReed(kenteken, moment);
      setResult(rows);
      if (rows.length === 0) {
        const cars = await fetchLoanCars();
        const car = cars.find((c) => plateKey(c.licenseNumber) === plateKey(kenteken));
        if (!car) {
          setWarning("Dit kenteken is geen bekende leenauto.");
        } else {
          const hist = await fetchUitleningen(car.id);
          const eerste = hist.length ? hist[hist.length - 1].uitgeleend_op : null;
          const legacyOpen = !car.available && !hist.some((h) => !h.ingeleverd_op);
          if (!eerste || moment < new Date(eerste) || legacyOpen) {
            setWarning(
              "Let op: dit moment valt (mogelijk) in een periode van vóór de uitleenregistratie" +
              (eerste ? ` (eerste registratie: ${formatNL(eerste)})` : "") +
              ". De bestuurder is dan niet in het systeem vastgelegd.",
            );
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserSearch className="h-5 w-5" /> Wie reed er?</CardTitle>
        <CardDescription>Vul kenteken, datum en tijd in zoals op de boete.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={zoek} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1"><Label htmlFor="wr-kenteken">Kenteken</Label><Input id="wr-kenteken" value={kenteken} onChange={(e) => setKenteken(e.target.value)} placeholder="bijv. V-335-GD" /></div>
          <div className="space-y-1"><Label htmlFor="wr-datum">Datum</Label><Input id="wr-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="wr-tijd">Tijd</Label><Input id="wr-tijd" type="time" step={1} value={tijd} onChange={(e) => setTijd(e.target.value)} /></div>
          <Button type="submit" disabled={busy}><Search className="h-4 w-4 mr-2" />{busy ? "Zoeken…" : "Zoeken"}</Button>
        </form>
        {error && <div className="text-sm text-destructive">{error}</div>}
        {result && result.length === 0 && (
          <div className="rounded-md border p-3 text-sm" data-testid="wie-reed-leeg">
            Deze leenauto was op dat moment niet (geregistreerd) uitgeleend.
          </div>
        )}
        {warning && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex gap-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {warning}
          </div>
        )}
        {result?.map((u) => (
          <div key={u.id} className="rounded-md border-2 border-primary/40 p-4 space-y-2" data-testid="wie-reed-resultaat">
            <div className="flex flex-wrap justify-between gap-2">
              <div className="text-lg font-semibold">{u.klant_naam}</div>
              <div className="text-sm text-muted-foreground">{u.kenteken} · {u.merk} {u.model}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div><span className="text-muted-foreground">Adres: </span>{[u.klant_adres, [u.klant_postcode, u.klant_plaats].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}</div>
              <div><span className="text-muted-foreground">Telefoon: </span>{u.klant_telefoon || "—"}</div>
              <div><span className="text-muted-foreground">E-mail: </span>{u.klant_email || "—"}</div>
              <div><span className="text-muted-foreground">Reden: </span>{REDEN_LABELS[u.reden]}</div>
              <div><span className="text-muted-foreground">Uitgegeven: </span>{formatNL(u.uitgeleend_op)}{u.uitgeleend_door_naam ? ` door ${u.uitgeleend_door_naam}` : ""}</div>
              <div><span className="text-muted-foreground">Ingeleverd: </span>{u.ingeleverd_op ? formatNL(u.ingeleverd_op) : "nog niet ingeleverd"}{u.ingenomen_door_naam ? ` bij ${u.ingenomen_door_naam}` : ""}</div>
              <div><span className="text-muted-foreground">Garantieclaim: </span>{u.warranty_claim_id ? u.warranty_claim_id.slice(0, 8) : "—"}</div>
              {u.notities && <div className="sm:col-span-2 whitespace-pre-line"><span className="text-muted-foreground">Notities: </span>{u.notities}</div>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const useBelowLg = () => {
  const q = "(max-width: 1023px)";
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
};

const LoanCarHistory: React.FC = () => {
  const isMobile = useBelowLg();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["leenautoUitleningen"], queryFn: () => fetchUitleningen() });
  const [kenteken, setKenteken] = useState("");
  const [klant, setKlant] = useState("");
  const [van, setVan] = useState("");
  const [tot, setTot] = useState("");
  const [status, setStatus] = useState<StatusFilter>("alle");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "uitgeleend_op", dir: "desc" });

  const filtered = useMemo(() => {
    const kk = plateKey(kenteken);
    const kl = klant.trim().toLowerCase();
    const vanD = van ? fromLocalInput(`${van}T00:00`) : null;
    const totD = tot ? fromLocalInput(`${tot}T23:59:59`) : null;
    const out = rows.filter((u) => {
      if (kk && !plateKey(u.kenteken).includes(kk)) return false;
      if (kl && ![u.klant_naam, u.klant_telefoon, u.klant_email].some((x) => (x || "").toLowerCase().includes(kl))) return false;
      // periode overlapt met [van, tot]
      const s = new Date(u.uitgeleend_op).getTime();
      const e = u.ingeleverd_op ? new Date(u.ingeleverd_op).getTime() : Infinity;
      if (vanD && e < vanD.getTime()) return false;
      if (totD && s > totD.getTime()) return false;
      if (status !== "alle" && statusOf(u) !== status && !(status === "open" && statusOf(u) === "te_laat")) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = (a as any)[sort.key] ?? "";
      const bv = (b as any)[sort.key] ?? "";
      if (!av && bv) return 1;
      if (av && !bv) return -1;
      return String(av).localeCompare(String(bv), "nl") * dir;
    });
  }, [rows, kenteken, klant, van, tot, status, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const exportCsv = () => {
    const header = ["Kenteken", "Merk", "Model", "Klant", "Telefoon", "E-mail", "Adres", "Postcode", "Plaats", "Reden", "Uitgegeven", "Verwacht terug", "Ingeleverd", "Uitgegeven door", "Ingenomen door", "Garantieclaim", "Status", "Notities"];
    const lines = filtered.map((u) => [
      u.kenteken, u.merk, u.model, u.klant_naam, u.klant_telefoon, u.klant_email, u.klant_adres, u.klant_postcode, u.klant_plaats,
      REDEN_LABELS[u.reden], formatNL(u.uitgeleend_op), formatNL(u.verwacht_terug_op), u.ingeleverd_op ? formatNL(u.ingeleverd_op) : "",
      u.uitgeleend_door_naam, u.ingenomen_door_naam, u.warranty_claim_id, statusOf(u), u.notities,
    ].map(csvCell).join(";"));
    const blob = new Blob(["\ufeff" + [header.map(csvCell).join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leenauto-historie-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const SortHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <TableHead>
      <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(k)}>
        {children} <ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leenauto historie</h1>
          <p className="text-muted-foreground mt-1">Wie reed wanneer in welke leenauto.</p>
        </div>
        <WieReed />
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Alle uitleningen</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1"><Label htmlFor="f-kenteken">Kenteken</Label><Input id="f-kenteken" value={kenteken} onChange={(e) => setKenteken(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="f-klant">Klant</Label><Input id="f-klant" value={klant} onChange={(e) => setKlant(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="f-van">Van</Label><Input id="f-van" type="date" value={van} onChange={(e) => setVan(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="f-tot">Tot</Label><Input id="f-tot" type="date" value={tot} onChange={(e) => setTot(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="afgesloten">Afgesloten</SelectItem>
                    <SelectItem value="te_laat">Te laat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Laden…</div>
            ) : isMobile ? (
              <MobileCardList empty="Geen uitleningen gevonden.">
                {filtered.map((u) => (
                  <MobileRecordCard
                    key={u.id}
                    title={u.klant_naam}
                    subtitle={`${u.merk} ${u.model}`}
                    aside={u.kenteken}
                    badges={<StatusBadge u={u} />}
                    fields={[
                      { label: "Uitgegeven", value: formatNL(u.uitgeleend_op) },
                      { label: "Ingeleverd", value: u.ingeleverd_op ? formatNL(u.ingeleverd_op) : "—" },
                      { label: "Verwacht terug", value: formatNL(u.verwacht_terug_op) },
                      { label: "Reden", value: REDEN_LABELS[u.reden] },
                      { label: "Contact", value: [u.klant_telefoon, u.klant_email].filter(Boolean).join(" · ") || "—", wide: true },
                    ]}
                  />
                ))}
              </MobileCardList>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead k="kenteken">Kenteken</SortHead>
                    <SortHead k="klant_naam">Klant</SortHead>
                    <TableHead>Contact</TableHead>
                    <SortHead k="uitgeleend_op">Uitgegeven</SortHead>
                    <TableHead>Verwacht terug</TableHead>
                    <SortHead k="ingeleverd_op">Ingeleverd</SortHead>
                    <SortHead k="reden">Reden</SortHead>
                    <TableHead>Door</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Geen uitleningen gevonden.</TableCell></TableRow>
                  ) : filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium whitespace-nowrap">{u.kenteken}<div className="text-xs text-muted-foreground">{u.merk} {u.model}</div></TableCell>
                      <TableCell>{u.klant_naam}</TableCell>
                      <TableCell className="text-xs">{[u.klant_telefoon, u.klant_email].filter(Boolean).join(" · ")}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatNL(u.uitgeleend_op)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatNL(u.verwacht_terug_op)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{u.ingeleverd_op ? formatNL(u.ingeleverd_op) : "—"}</TableCell>
                      <TableCell>{REDEN_LABELS[u.reden]}</TableCell>
                      <TableCell className="text-xs">{u.uitgeleend_door_naam || "—"}{u.ingenomen_door_naam ? ` / ${u.ingenomen_door_naam}` : ""}</TableCell>
                      <TableCell><StatusBadge u={u} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LoanCarHistory;
