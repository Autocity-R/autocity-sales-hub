import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, Package, AlertTriangle, Users, Download, RefreshCw,
  ExternalLink, Star, CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { SalespersonDetailDialog } from "@/components/reports/SalespersonDetailDialog";

interface B2BKans {
  auto: string;
  kenteken: string;
  inkoopprijs: number;
  b2bAanbodprijs: number;
  dealerNaam: string;
  dealerVerkoopprijs: number;
  dealerStagedagen: number;
  verkochtDagenGeleden: number;
  onzeMarge: number;
  dealerMargeruimte: number;
  score: "STERK" | "MOGELIJK";
}

const fmt = (n: number) => `€${n.toLocaleString("nl-NL")}`;

export const DaanDashboard: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // B2B kansen data
  const { data: b2bData, isLoading: b2bLoading, refetch: refetchB2B } = useQuery({
    queryKey: ["daan-b2b-kansen"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("daan-b2b-analyse", {
        body: { mode: "download" },
      });
      if (error) throw error;
      return data as {
        sterkeKansen: B2BKans[];
        mogelijkeKansen: B2BKans[];
        totaalOffline: number;
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Offline voorraad
  const { data: offlineData, isLoading: offlineLoading } = useQuery({
    queryKey: ["daan-offline-voorraad"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, license_number, purchase_price, details, created_at")
        .eq("status", "voorraad")
        .gt("purchase_price", 0);

      if (error) throw error;
      const now = Date.now();
      const DAY = 86400000;

      return (data || [])
        .filter((v: any) => {
          const d = v.details || {};
          // Exclude online, inruil, en onderweg (nog in transport)
          return d.showroomOnline !== true && d.isTradeIn !== true && d.transportStatus !== "onderweg";
        })
        .map((v: any) => ({
          id: v.id,
          naam: `${v.brand || ""} ${v.model || ""}`.trim(),
          kenteken: v.license_number || "",
          inkoopprijs: Number(v.purchase_price) || Number(v.details?.purchasePrice) || 0,
          dagenInBezit: Math.floor((now - new Date(v.created_at).getTime()) / DAY),
        }))
        .sort((a: any, b: any) => b.dagenInBezit - a.dagenInBezit);
    },
  });

  // Team performance — live data uit vehicles tabel
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["daan-team-performance"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: soldVehicles, error } = await supabase
        .from("vehicles")
        .select("id, status, selling_price, purchase_price, details, sold_date")
        .in("status", ["verkocht_b2b", "verkocht_b2c", "afgeleverd"])
        .gte("sold_date", monthStart);

      if (error) throw error;

      const teamMappings: Record<string, string[]> = {
        Daan: ["daan", "daan leyte", "daan@auto-city.nl"],
        Martijn: ["martijn", "martijn zuyderhoudt", "martijn@auto-city.nl"],
        Alex: ["alex", "alexander", "alexander kool", "alex@auto-city.nl"],
        Hendrik: ["hendrik", "hendrik@auto-city.nl"],
        Mario: ["mario", "mario kroon", "mario@auto-city.nl"],
      };

      const stats: Record<string, { b2c: number; b2b: number; total: number; revenue: number; vehicles: any[] }> = {};
      Object.keys(teamMappings).forEach((n) => {
        stats[n] = { b2c: 0, b2b: 0, total: 0, revenue: 0, vehicles: [] };
      });

      for (const v of soldVehicles || []) {
        const details = (v.details || {}) as any;
        const sp = (details.salespersonName || details.salesperson || details.verkoper || "").toLowerCase().trim();
        if (!sp) continue;

        let matched: string | null = null;
        for (const [name, variations] of Object.entries(teamMappings)) {
          if (variations.some((var_) => sp.includes(var_) || var_.includes(sp))) {
            matched = name;
            break;
          }
        }
        if (!matched) continue;

        const s = stats[matched];
        const salesType = details.salesType;
        const isB2B = v.status === "verkocht_b2b" || (v.status === "afgeleverd" && salesType === "b2b");
        const isB2C = v.status === "verkocht_b2c" || (v.status === "afgeleverd" && (salesType === "b2c" || !salesType));

        if (isB2B) s.b2b++;
        if (isB2C) s.b2c++;
        s.total++;
        s.revenue += Number(v.selling_price) || 0;
        const purchase = Number(v.purchase_price) || Number(details.purchasePrice) || 0;
        const selling = Number(v.selling_price) || 0;
        if (selling > 0 && purchase > 0) s.totalMargin += selling - purchase;
      }

      return Object.entries(stats)
        .filter(([, s]) => s.total > 0)
        .map(([name, s]) => ({
          name,
          ...s,
          avgMargin: s.total > 0 ? Math.round(s.totalMargin / s.total) : 0,
          norm: 10,
          opNorm: s.b2c >= 10,
        }));
    },
  });

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    toast.info("B2B analyse wordt uitgevoerd...");
    try {
      const { data, error } = await supabase.functions.invoke("daan-b2b-analyse", {
        body: { mode: "download" },
      });
      if (error) throw error;
      await refetchB2B();
      toast.success(`Analyse compleet: ${(data?.sterkeKansen?.length || 0) + (data?.mogelijkeKansen?.length || 0)} kansen gevonden`);
    } catch (e: any) {
      toast.error("Analyse mislukt: " + (e.message || "Onbekende fout"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sterke = b2bData?.sterkeKansen || [];
  const mogelijke = b2bData?.mogelijkeKansen || [];

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Star className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {b2bLoading ? <Skeleton className="h-7 w-8" /> : sterke.length}
              </p>
              <p className="text-xs text-muted-foreground">Sterke B2B kansen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <CircleDot className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-500">
                {b2bLoading ? <Skeleton className="h-7 w-8" /> : mogelijke.length}
              </p>
              <p className="text-xs text-muted-foreground">Mogelijke kansen</p>
            </div>
          </CardContent>
        </Card>
        <Card className={offlineData && offlineData.length > 20 ? "border-destructive" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {offlineLoading ? <Skeleton className="h-7 w-8" /> : offlineData?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Offline auto's</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {teamLoading ? <Skeleton className="h-7 w-8" /> : teamData?.reduce((s, t) => s + t.total, 0) || 0}
              </p>
              <p className="text-xs text-muted-foreground">Verkopen deze maand</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* B2B Kansen Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            B2B Kansen
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isAnalyzing ? "animate-spin" : ""}`} />
              {isAnalyzing ? "Bezig..." : "Analyse"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {b2bLoading ? (
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Tabs defaultValue="sterk" className="w-full">
              <TabsList className="mb-3">
                <TabsTrigger value="sterk">🟢 Sterk ({sterke.length})</TabsTrigger>
                <TabsTrigger value="mogelijk">🟡 Mogelijk ({mogelijke.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="sterk">
                <KansenTabel kansen={sterke} />
              </TabsContent>
              <TabsContent value="mogelijk">
                <KansenTabel kansen={mogelijke} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Offline Voorraad */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Offline Voorraad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offlineLoading ? (
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {offlineData?.slice(0, 20).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between text-sm py-1.5 px-2 hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{v.naam}</span>
                    <span className="text-muted-foreground text-xs">{v.kenteken}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">{fmt(v.inkoopprijs)}</span>
                    <Badge variant={v.dagenInBezit > 60 ? "destructive" : v.dagenInBezit > 30 ? "secondary" : "outline"}>
                      {v.dagenInBezit}d
                    </Badge>
                  </div>
                </div>
              ))}
              {(!offlineData || offlineData.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Alle auto's zijn online</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Performance (deze maand)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <div className="space-y-2">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {teamData?.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="font-medium w-20">{t.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      B2C: {t.b2c} | B2B: {t.b2b}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Omzet: {fmt(t.revenue)}
                    </span>
                    <span className="text-xs text-green-600">
                      Ø marge: {fmt(t.avgMargin)}
                    </span>
                    <Badge variant={t.opNorm ? "default" : "destructive"}>
                      {t.b2c}/{t.norm}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!teamData || teamData.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Geen verkoopdata deze maand</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Sub-component for B2B kansen table
function KansenTabel({ kansen }: { kansen: B2BKans[] }) {
  if (kansen.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Geen kansen gevonden</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="text-left py-2 px-1">Auto</th>
            <th className="text-left py-2 px-1">Kenteken</th>
            <th className="text-right py-2 px-1">Inkoop</th>
            <th className="text-right py-2 px-1 font-bold">B2B Aanbod</th>
            <th className="text-left py-2 px-1">Dealer</th>
            <th className="text-right py-2 px-1">Dealer Prijs</th>
            <th className="text-center py-2 px-1">Stagedn</th>
            <th className="text-center py-2 px-1">Verk. dgn</th>
            <th className="text-right py-2 px-1 font-bold text-green-600">Marge</th>
          </tr>
        </thead>
        <tbody>
          {kansen.map((k, i) => (
            <tr key={`${k.kenteken}-${i}`} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2 px-1 font-medium">{k.auto}</td>
              <td className="py-2 px-1 text-muted-foreground">{k.kenteken}</td>
              <td className="py-2 px-1 text-right">{fmt(k.inkoopprijs)}</td>
              <td className="py-2 px-1 text-right font-bold">{fmt(k.b2bAanbodprijs)}</td>
              <td className="py-2 px-1">{k.dealerNaam}</td>
              <td className="py-2 px-1 text-right">{fmt(k.dealerVerkoopprijs)}</td>
              <td className="py-2 px-1 text-center">{k.dealerStagedagen}</td>
              <td className="py-2 px-1 text-center">{k.verkochtDagenGeleden}</td>
              <td className="py-2 px-1 text-right font-bold text-green-600">{fmt(k.onzeMarge)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
