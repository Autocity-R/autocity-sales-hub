import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Clock, FileText, Truck, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAY = 86400000;

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY);
}

export const BpmHuysTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [meldcode, setMeldcode] = useState("");
  const [berichtType, setBerichtType] = useState<string>("");
  const [foundVehicle, setFoundVehicle] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // Fetch all bpmRequested vehicles
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["bpm-huys-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, vin, license_number, import_status, status, details, created_at")
        .neq("status", "afgeleverd");
      if (error) throw error;
      return (data || []).filter((v: any) => {
        const d = v.details || {};
        return d.bpmRequested === true && d.isTradeIn !== true && d.isTradeIn !== "true";
      });
    },
    refetchInterval: 60000,
  });

  // Fetch whatsapp logs
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

  // Sectie 1: Actie vereist door ons (opgenomen, geen papieren_verstuurd)
  const actieDoorOns = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter((v) => hasLog(v.id, "auto_opgenomen") && !hasLog(v.id, "papieren_verstuurd"));
  }, [vehicles, logsByVehicle]);

  // Sectie 2: Wacht op BPM Huys
  const wachtOpBpmHuys = useMemo(() => {
    if (!vehicles) return [];
    const threeDaysAgo = new Date(Date.now() - 3 * DAY);
    
    // Aangemeld >7d zonder opname
    const noOpname = vehicles.filter((v) => {
      const d = (v.details || {}) as Record<string, any>;
      if (hasLog(v.id, "auto_opgenomen")) return false;
      if (!d.bpmRequestedDate) return false;
      return daysSince(d.bpmRequestedDate as string) > 7;
    });

    // Papieren verstuurd >3d zonder RDW
    const noRdw = vehicles.filter((v) => {
      if (!hasLog(v.id, "papieren_verstuurd")) return false;
      const datum = getLogDate(v.id, "papieren_verstuurd");
      if (!datum || new Date(datum) >= threeDaysAgo) return false;
      return !["aanvraag_ontvangen", "goedgekeurd", "bpm_betaald", "ingeschreven"].includes(v.import_status || "");
    });

    return [...noOpname.map((v) => ({ ...v, _reason: "Niet opgenomen na 7+ dagen" })),
            ...noRdw.map((v) => ({ ...v, _reason: "Papieren verstuurd, geen RDW na 3+ dagen" }))];
  }, [vehicles, logsByVehicle]);

  // Sectie 3: In behandeling
  const inBehandeling = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.map((v) => {
      let stap = "Aangemeld";
      if (hasLog(v.id, "auto_opgenomen")) stap = "Opgenomen";
      if (hasLog(v.id, "papieren_verstuurd")) stap = "Papieren verstuurd";
      if (["aanvraag_ontvangen", "goedgekeurd", "bpm_betaald"].includes(v.import_status || "")) stap = v.import_status!;
      if (v.import_status === "ingeschreven") stap = "✅ Ingeschreven";
      return { ...v, _stap: stap };
    });
  }, [vehicles, logsByVehicle]);

  // Meldcode zoeken
  const handleSearch = async () => {
    if (meldcode.length !== 4) {
      toast.error("Meldcode moet exact 4 cijfers zijn");
      return;
    }
    setSearching(true);
    setFoundVehicle(null);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, vin, license_number, details")
        .neq("status", "afgeleverd");

      if (error) throw error;

      const match = (data || []).find((v: any) => {
        const d = v.details || {};
        if (d.bpmRequested !== true) return false;
        if (d.isTradeIn === true || d.isTradeIn === "true") return false;
        if (!v.vin || v.vin.length < 4) return false;
        return v.vin.slice(-4) === meldcode;
      });

      if (match) {
        setFoundVehicle(match);
      } else {
        toast.error(`Geen auto gevonden met meldcode ${meldcode} en bpmRequested=true`);
      }
    } catch (err) {
      toast.error("Zoeken mislukt");
    } finally {
      setSearching(false);
    }
  };

  // Opslaan whatsapp log
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!foundVehicle || !berichtType) throw new Error("Vul alle velden in");
      const { error } = await supabase.from("bpm_huys_whatsapp_log").insert({
        vehicle_id: foundVehicle.id,
        vin: foundVehicle.vin,
        meldcode: meldcode,
        bericht_type: berichtType,
        bericht_datum: new Date().toISOString(),
        afzender: "handmatig",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("WhatsApp bericht gelogd");
      setMeldcode("");
      setBerichtType("");
      setFoundVehicle(null);
      queryClient.invalidateQueries({ queryKey: ["bpm-huys-logs"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Laden...</div>;

  return (
    <div className="space-y-4">
      {/* Sectie 1: Actie vereist door ons */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-orange-500" />
            Actie vereist door ons — papieren sturen ({actieDoorOns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actieDoorOns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen acties nodig</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Auto</th>
                    <th className="pb-2 pr-3 font-medium">VIN</th>
                    <th className="pb-2 pr-3 font-medium">Kenteken</th>
                    <th className="pb-2 font-medium">Opgenomen op</th>
                  </tr>
                </thead>
                <tbody>
                  {actieDoorOns.map((v) => (
                    <tr key={v.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium">{v.brand} {v.model}</td>
                      <td className="py-2 pr-3 text-xs">{v.vin || "—"}</td>
                      <td className="py-2 pr-3 text-xs">{v.license_number || "—"}</td>
                      <td className="py-2 text-xs">{getLogDate(v.id, "auto_opgenomen")?.slice(0, 10) || "?"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sectie 2: Wacht op BPM Huys */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Wacht op BPM Huys ({wachtOpBpmHuys.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wachtOpBpmHuys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Alles op schema</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Auto</th>
                    <th className="pb-2 pr-3 font-medium">VIN</th>
                    <th className="pb-2 pr-3 font-medium">Probleem</th>
                    <th className="pb-2 font-medium">Dagen</th>
                  </tr>
                </thead>
                <tbody>
                  {wachtOpBpmHuys.map((v: any, i) => (
                    <tr key={`${v.id}-${i}`} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium">{v.brand} {v.model}</td>
                      <td className="py-2 pr-3 text-xs">{v.vin || "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="destructive" className="text-[10px]">{v._reason}</Badge>
                      </td>
                      <td className="py-2 text-center">
                        <span className="text-red-500 font-medium">{daysSince(v.details?.bpmRequestedDate || v.created_at)}d</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sectie 3: In behandeling */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" />
            In behandeling — alle BPM Huys auto's ({inBehandeling.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inBehandeling.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen auto's in behandeling</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Auto</th>
                    <th className="pb-2 pr-3 font-medium">VIN</th>
                    <th className="pb-2 pr-3 font-medium">Kenteken</th>
                    <th className="pb-2 pr-3 font-medium">Stap</th>
                    <th className="pb-2 font-medium">Import status</th>
                  </tr>
                </thead>
                <tbody>
                  {inBehandeling.map((v: any) => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 pr-3 font-medium">{v.brand} {v.model}</td>
                      <td className="py-2 pr-3 text-xs">{v.vin || "—"}</td>
                      <td className="py-2 pr-3 text-xs">{v.license_number || "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-[10px]">{v._stap}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary" className="text-[10px]">{v.import_status || "niet_gestart"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sectie 4: Handmatig invoer */}
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

                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!berichtType || saveMutation.isPending}
                >
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
