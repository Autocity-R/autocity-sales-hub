import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, FileText, Search, Plus, Send, Truck, Receipt } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAY = 86400000;
const DONE_STATUSES = ["aanvraag_ontvangen", "goedgekeurd", "bpm_betaald", "ingeschreven"];
const SOLD_STATUSES = ["verkocht_b2c", "verkocht_b2b", "afgeleverd"];

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY);
}

type PipelineColumn = "aangemeld" | "wacht_papieren" | "papieren_verstuurd" | "factuur";

const COLUMNS: { key: PipelineColumn; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "aangemeld", label: "Aangemeld", icon: <Clock className="h-4 w-4" />, color: "text-blue-500" },
  { key: "wacht_papieren", label: "Wacht op papieren", icon: <FileText className="h-4 w-4" />, color: "text-orange-500" },
  { key: "papieren_verstuurd", label: "Papieren verstuurd", icon: <Send className="h-4 w-4" />, color: "text-purple-500" },
  { key: "factuur", label: "Factuur", icon: <Receipt className="h-4 w-4" />, color: "text-green-500" },
];

export const BpmHuysTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCol, setSelectedCol] = useState<PipelineColumn>("aangemeld");
  const [meldcode, setMeldcode] = useState("");
  const [berichtType, setBerichtType] = useState("");
  const [foundVehicle, setFoundVehicle] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["bpm-huys-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, vin, license_number, import_status, status, details, created_at")
        .not("status", "in", `(${SOLD_STATUSES.join(",")})`);
      if (error) throw error;
      return (data || []).filter((v: any) => {
        const d = v.details || {};
        return d.bpmRequested === true
          && d.isTradeIn !== true && d.isTradeIn !== "true"
          && !DONE_STATUSES.includes(v.import_status || "");
      });
    },
    refetchInterval: 60000,
  });

  const { data: whatsappLogs } = useQuery({
    queryKey: ["bpm-huys-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bpm_huys_whatsapp_log")
        .select("*")
        .order("bericht_datum", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const logsByVehicle = useMemo(() => {
    const m: Record<string, any[]> = {};
    (whatsappLogs || []).forEach((l) => {
      if (!l.vehicle_id) return;
      if (!m[l.vehicle_id]) m[l.vehicle_id] = [];
      m[l.vehicle_id].push(l);
    });
    return m;
  }, [whatsappLogs]);

  const hasLog = (vid: string, type: string) =>
    (logsByVehicle[vid] || []).some((l) => l.bericht_type === type);

  const getLogDate = (vid: string, type: string) => {
    const log = (logsByVehicle[vid] || []).find((l) => l.bericht_type === type);
    return log?.bericht_datum;
  };

  const pipeline = useMemo(() => {
    const cols: Record<PipelineColumn, any[]> = {
      aangemeld: [],
      wacht_papieren: [],
      papieren_verstuurd: [],
      factuur: [],
    };
    if (!vehicles) return cols;

    vehicles.forEach((v) => {
      const hasOpgenomen = hasLog(v.id, "auto_opgenomen");
      const hasPapieren = hasLog(v.id, "papieren_verstuurd");

      if (hasPapieren) {
        const datum = getLogDate(v.id, "papieren_verstuurd");
        const dagen = daysSince(datum);
        cols.papieren_verstuurd.push({ ...v, _datum: datum, _dagen: dagen });
      } else if (hasOpgenomen) {
        const datum = getLogDate(v.id, "auto_opgenomen");
        cols.wacht_papieren.push({ ...v, _datum: datum });
      } else {
        const d = (v.details || {}) as Record<string, any>;
        const dagen = daysSince(d.bpmRequestedDate as string || v.created_at);
        cols.aangemeld.push({ ...v, _datum: d.bpmRequestedDate || v.created_at, _dagen: dagen });
      }
    });

    return cols;
  }, [vehicles, logsByVehicle]);

  // Search
  const handleSearch = async () => {
    if (meldcode.length !== 4) { toast.error("Meldcode moet exact 4 cijfers zijn"); return; }
    setSearching(true);
    setFoundVehicle(null);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, vin, license_number, details")
        .not("status", "in", `(${SOLD_STATUSES.join(",")})`);
      if (error) throw error;
      const match = (data || []).find((v: any) => {
        const d = v.details || {};
        return d.bpmRequested === true && d.isTradeIn !== true && d.isTradeIn !== "true"
          && v.vin && v.vin.length >= 4 && v.vin.slice(-4) === meldcode;
      });
      if (match) setFoundVehicle(match);
      else toast.error(`Geen auto gevonden met meldcode ${meldcode}`);
    } catch { toast.error("Zoeken mislukt"); }
    finally { setSearching(false); }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!foundVehicle || !berichtType) throw new Error("Vul alle velden in");
      const { error } = await supabase.from("bpm_huys_whatsapp_log").insert({
        vehicle_id: foundVehicle.id,
        vin: foundVehicle.vin,
        meldcode,
        bericht_type: berichtType,
        bericht_datum: new Date().toISOString(),
        afzender: "handmatig",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("WhatsApp bericht gelogd");
      setMeldcode(""); setBerichtType(""); setFoundVehicle(null);
      queryClient.invalidateQueries({ queryKey: ["bpm-huys-logs"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Laden...</div>;

  const activeItems = pipeline[selectedCol];

  return (
    <div className="space-y-4">
      {/* Pipeline columns */}
      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const count = col.key === "factuur" ? 0 : pipeline[col.key].length;
          const isActive = selectedCol === col.key;
          return (
            <Card
              key={col.key}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isActive && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedCol(col.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("flex items-center gap-1.5 text-xs font-medium", col.color)}>
                    {col.icon} {col.label}
                  </span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                {col.key === "aangemeld" && (
                  <p className="text-[10px] text-muted-foreground">Wacht op opname BPM Huys</p>
                )}
                {col.key === "wacht_papieren" && (
                  <p className="text-[10px] text-muted-foreground">Actie door ons — papieren sturen</p>
                )}
                {col.key === "papieren_verstuurd" && (
                  <p className="text-[10px] text-muted-foreground">Wacht op RDW aanmelding</p>
                )}
                {col.key === "factuur" && (
                  <p className="text-[10px] text-muted-foreground">Binnenkort beschikbaar</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {COLUMNS.find((c) => c.key === selectedCol)?.icon}
            {COLUMNS.find((c) => c.key === selectedCol)?.label}
            {selectedCol !== "factuur" && <Badge variant="secondary" className="text-[10px]">{activeItems.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCol === "factuur" ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Factuurverwerking via email — binnenkort beschikbaar
            </p>
          ) : activeItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Geen auto's in deze stap</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Auto</th>
                    <th className="pb-2 pr-3 font-medium">VIN</th>
                    <th className="pb-2 pr-3 font-medium">Kenteken</th>
                    <th className="pb-2 pr-3 font-medium">
                      {selectedCol === "aangemeld" ? "Aangemeld op" :
                       selectedCol === "wacht_papieren" ? "Opgenomen op" : "Verstuurd op"}
                    </th>
                    {(selectedCol === "aangemeld" || selectedCol === "papieren_verstuurd") && (
                      <th className="pb-2 font-medium">Dagen</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((v: any) => {
                    const isLate = selectedCol === "aangemeld" ? v._dagen > 7
                      : selectedCol === "papieren_verstuurd" ? v._dagen > 3 : false;
                    return (
                      <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pr-3 font-medium">{v.brand} {v.model}</td>
                        <td className="py-2 pr-3 text-xs font-mono">{v.vin || "—"}</td>
                        <td className="py-2 pr-3 text-xs">{v.license_number || "—"}</td>
                        <td className="py-2 pr-3 text-xs">{v._datum?.slice(0, 10) || "—"}</td>
                        {(selectedCol === "aangemeld" || selectedCol === "papieren_verstuurd") && (
                          <td className="py-2">
                            <Badge variant={isLate ? "destructive" : "outline"} className="text-[10px]">
                              {v._dagen}d
                            </Badge>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual entry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-green-500" />
            Handmatig WhatsApp bericht loggen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Meldcode (4 cijfers)"
                value={meldcode}
                onChange={(e) => setMeldcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-40"
                maxLength={4}
              />
              <Button variant="outline" size="sm" onClick={handleSearch} disabled={searching || meldcode.length !== 4}>
                <Search className="h-3 w-3 mr-1" /> Zoek
              </Button>
            </div>
            {foundVehicle && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{foundVehicle.brand} {foundVehicle.model}</span>
                  <span className="text-muted-foreground">{foundVehicle.license_number || foundVehicle.vin}</span>
                </div>
                <Select value={berichtType} onValueChange={setBerichtType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Type bericht" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_opgenomen">Auto opgenomen</SelectItem>
                    <SelectItem value="papieren_verstuurd">Papieren verstuurd</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!berichtType || saveMutation.isPending}>
                  Opslaan
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
