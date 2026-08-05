import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AsPage, AsCard, AsCardHead, AsLicensePlate, AsPill } from "@/components/aftersales/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, Loader2, Download } from "lucide-react";
import { getWorkshopCustomers, WorkshopCustomerRow } from "@/services/workshopCustomersService";
import { buildHaystack, matchesSearch } from "@/lib/searchNormalize";
import { eur } from "@/services/workshopInvoiceService";

type Recency = "all" | "6m" | "12m" | "recent";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

const WerkplaatsKlanten: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [recency, setRecency] = useState<Recency>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["workshop-customers"],
    queryFn: getWorkshopCustomers,
  });

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (recency !== "all") {
        const last = r.lastVisit ? new Date(r.lastVisit) : null;
        if (recency === "recent") {
          if (!last || last < monthsAgo(6)) return false;
        } else {
          const cutoff = recency === "6m" ? monthsAgo(6) : monthsAgo(12);
          if (last && last >= cutoff) return false;
        }
      }
      if (!q.trim()) return true;
      const hay = buildHaystack([
        r.name, r.email, r.phone, r.city, r.postalCode,
        ...r.vehicles.flatMap((v) => [v.plate, v.brand, v.model]),
      ]);
      return matchesSearch(hay, q);
    });
  }, [data, q, recency]);

  const exportCsv = () => {
    const head = ["Naam", "E-mail", "Telefoon", "Postcode", "Plaats", "Auto's", "Laatste bezoek", "Bezoeken", "Facturen", "Totaal besteed"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [head.map(esc).join(";")];
    filtered.forEach((r) => {
      lines.push([
        r.name, r.email || "", r.phone || "", r.postalCode || "", r.city || "",
        r.vehicles.map((v) => `${v.plate || "?"} ${v.brand || ""} ${v.model || ""}`.trim()).join(" / "),
        r.lastVisit ? new Date(r.lastVisit).toLocaleDateString("nl-NL") : "",
        r.visits, r.invoiceCount, (r.totalSpent || 0).toFixed(2).replace(".", ","),
      ].map(esc).join(";"));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `werkplaatsklanten-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDossier = (r: WorkshopCustomerRow) => {
    if (r.contactId) navigate(`/customers/${r.contactId}?tab=workshop`);
  };

  return (
    <DashboardLayout>
      <AsPage>
        <div className="flex items-center justify-between mb-5 gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Werkplaatsklanten</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Alle klanten die ooit in onze werkplaats zijn geweest — voor gerichte opvolging en marketing.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-1" />CSV-export
          </Button>
        </div>

        <AsCard>
          <AsCardHead
            icon={<Users className="h-4 w-4" />} tone="teal" title="Klantenbestand werkplaats"
            subtitle="Zoek op naam, e-mail, telefoon, kenteken, merk/model, postcode of plaats"
            count={filtered.length}
          />
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-8" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ["all", "Alle"],
                ["recent", "Bezoek < 6 mnd"],
                ["6m", "Niet geweest > 6 mnd"],
                ["12m", "Niet geweest > 12 mnd"],
              ] as [Recency, string][]).map(([v, label]) => (
                <Button key={v} size="sm" variant={recency === v ? "default" : "outline"} onClick={() => setRecency(v)}>
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Laden…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-[13px] text-slate-400">Geen werkplaatsklanten gevonden.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <div
                  key={r.key}
                  role={r.contactId ? "button" : undefined}
                  onClick={() => openDossier(r)}
                  className={`flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-4 py-3 ${r.contactId ? "cursor-pointer hover:bg-slate-50" : ""}`}
                >
                  <div className="md:w-[210px] min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">{r.name}</div>
                    <div className="text-[12px] text-slate-500 truncate">{r.email || r.phone || "—"}</div>
                  </div>
                  <div className="md:w-[130px] text-[12px] text-slate-500 truncate">{r.phone || "—"}</div>
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                    {r.vehicles.length === 0 ? (
                      <span className="text-[12px] text-slate-400">Geen auto vastgelegd</span>
                    ) : (
                      r.vehicles.slice(0, 3).map((v, i) => (
                        <span key={`${r.key}-${v.id || v.plate || i}`} className="inline-flex items-center gap-1.5">
                          <AsLicensePlate value={v.plate} size="sm" />
                          <span className="text-[12px] text-slate-600">{[v.brand, v.model].filter(Boolean).join(" ")}</span>
                        </span>
                      ))
                    )}
                    {r.vehicles.length > 3 && (
                      <span className="text-[12px] text-slate-400">+{r.vehicles.length - 3}</span>
                    )}
                  </div>
                  <div className="md:w-[110px] text-[12px] text-slate-600">{fmtDate(r.lastVisit)}</div>
                  <AsPill tone="slate">{r.visits} bezoek{r.visits === 1 ? "" : "en"}</AsPill>
                  <div className="md:w-[100px] md:text-right text-[13px] font-semibold tabular-nums">
                    {eur(r.totalSpent || 0)}
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

export default WerkplaatsKlanten;