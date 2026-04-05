import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Eye, BarChart3, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface KevinKPIStripProps {
  totalCount: number;
  avgStockDays: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  lastSync: string | null;
  syncing: boolean;
  onSync: () => void;
  onCSVExport: () => void;
}

export const KevinKPIStrip: React.FC<KevinKPIStripProps> = ({
  totalCount, avgStockDays, redCount, yellowCount, greenCount,
  lastSync, syncing, onSync, onCSVExport,
}) => {
  const daysColor = avgStockDays > 45 ? 'text-red-600' : avgStockDays > 35 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" /> Online
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" /> Gem. Stagedagen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${daysColor}`}>{avgStockDays}</div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Actie vereist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{redCount}</div>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" /> Let op
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{yellowCount}</div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" /> Goed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{greenCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Laatste sync</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-medium">
            {lastSync ? format(new Date(lastSync), 'dd MMM HH:mm', { locale: nl }) : 'Nooit'}
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={onSync} disabled={syncing}>
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button size="sm" variant="outline" onClick={onCSVExport}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
