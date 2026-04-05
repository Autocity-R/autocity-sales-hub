import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Clock, CheckCircle, ChevronDown, ChevronRight, Download } from "lucide-react";
import { KevinVehicleCard } from "./KevinVehicleCard";
import { getReasons } from "./types";
import { exportTieredExcel } from "./kevinExcelExport";
import type { JoinedVehicle } from "./types";

interface KevinActionListProps {
  redVehicles: JoinedVehicle[];
  yellowVehicles: JoinedVehicle[];
  greenVehicles: JoinedVehicle[];
}

const INITIAL_SHOW = 5;

const TierSection: React.FC<{
  title: string;
  vehicles: JoinedVehicle[];
  icon: React.ReactNode;
  defaultOpen: boolean;
  borderColor: string;
  bgColor: string;
  tier: 'red' | 'yellow' | 'green';
  onExport: () => void;
}> = ({ title, vehicles, icon, defaultOpen, borderColor, bgColor, onExport }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? vehicles : vehicles.slice(0, INITIAL_SHOW);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={`${borderColor} ${bgColor}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {icon}
              <span className="flex-1">{title} — {vehicles.length} voertuigen</span>
              {vehicles.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); onExport(); }}
                >
                  <Download className="h-3 w-3 mr-1" /> Excel
                </Button>
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 pt-0">
            {visible.map(v => (
              <KevinVehicleCard key={v.id} vehicle={v} reasons={getReasons(v)} />
            ))}
            {vehicles.length > INITIAL_SHOW && !showAll && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(true)} className="w-full text-muted-foreground">
                Toon alle {vehicles.length} voertuigen
              </Button>
            )}
            {showAll && vehicles.length > INITIAL_SHOW && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(false)} className="w-full text-muted-foreground">
                Toon minder
              </Button>
            )}
            {vehicles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Geen voertuigen in deze categorie</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const KevinActionList: React.FC<KevinActionListProps> = ({ redVehicles, yellowVehicles, greenVehicles }) => {
  return (
    <div className="space-y-4">
      {/* Export all button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportTieredExcel(redVehicles, yellowVehicles, greenVehicles, 'all')}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" /> Totale Voorraad Excel
        </Button>
      </div>

      <TierSection
        title="🔴 ACTIE VEREIST — Vandaag doen"
        vehicles={redVehicles}
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        defaultOpen={true}
        borderColor="border-red-200"
        bgColor="bg-red-50/30 dark:bg-red-950/10"
        tier="red"
        onExport={() => exportTieredExcel(redVehicles, yellowVehicles, greenVehicles, 'red')}
      />
      <TierSection
        title="🟡 LET OP — Deze week"
        vehicles={yellowVehicles}
        icon={<Clock className="h-4 w-4 text-yellow-500" />}
        defaultOpen={false}
        borderColor="border-yellow-200"
        bgColor="bg-yellow-50/30 dark:bg-yellow-950/10"
        tier="yellow"
        onExport={() => exportTieredExcel(redVehicles, yellowVehicles, greenVehicles, 'yellow')}
      />
      <TierSection
        title="🟢 GOED — Geen actie nodig"
        vehicles={greenVehicles}
        icon={<CheckCircle className="h-4 w-4 text-green-500" />}
        defaultOpen={false}
        borderColor="border-green-200"
        bgColor="bg-green-50/30 dark:bg-green-950/10"
        tier="green"
        onExport={() => exportTieredExcel(redVehicles, yellowVehicles, greenVehicles, 'green')}
      />
    </div>
  );
};
