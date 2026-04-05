import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { JoinedVehicle } from "./types";

interface KevinVehicleCardProps {
  vehicle: JoinedVehicle;
  reasons: string[];
}

const formatPrice = (n: number | null) => n != null ? `€${n.toLocaleString('nl-NL')}` : '-';

export const KevinVehicleCard: React.FC<KevinVehicleCardProps> = ({ vehicle: v, reasons }) => {
  const borderColor = v.category === 'red' ? 'border-l-red-500' : v.category === 'yellow' ? 'border-l-yellow-500' : 'border-l-green-500';
  const bgColor = v.category === 'red' ? 'bg-red-50/50 dark:bg-red-950/10' : v.category === 'yellow' ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : '';

  return (
    <div className={`border border-l-4 ${borderColor} ${bgColor} rounded-md p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4`}>
      {/* Vehicle info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{v.brand} {v.model}</div>
        <div className="text-xs text-muted-foreground">{v.license_number ?? '-'} · {v.fuel ?? '-'}</div>
      </div>

      {/* Stock days */}
      <div className="text-center sm:text-right">
        <div className={`text-sm font-bold ${(v.stock_days ?? 0) > 45 ? 'text-red-600' : (v.stock_days ?? 0) > 35 ? 'text-yellow-600' : 'text-foreground'}`}>
          {v.stock_days ?? '-'} dagen
        </div>
        <div className="text-xs text-muted-foreground">gem: {v.stock_days_average ?? '-'}</div>
      </div>

      {/* Price + advice */}
      <div className="text-center sm:text-right min-w-[120px]">
        <div className="text-sm font-medium">{formatPrice(v.price_local)}</div>
        {v.price_warning != null && v.price_warning < -50 && (
          <div className="text-xs text-green-600 font-medium">Verhoog {formatPrice(Math.abs(v.price_warning))}</div>
        )}
        {v.price_warning != null && v.price_warning > 50 && (
          <div className="text-xs text-orange-600 font-medium">Zak {formatPrice(v.price_warning)}</div>
        )}
      </div>

      {/* VVP50 comparison */}
      <div className="text-center sm:text-right min-w-[90px]">
        {v.price_vs_market != null ? (
          <div className={`text-xs flex items-center justify-end gap-0.5 ${v.price_vs_market > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {v.price_vs_market > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {v.price_vs_market > 0 ? '+' : ''}{formatPrice(v.price_vs_market)}
          </div>
        ) : <span className="text-xs text-muted-foreground">-</span>}
        <div className="text-xs text-muted-foreground">vs mediaan</div>
      </div>

      {/* Rank */}
      <div className="text-center sm:text-right min-w-[50px]">
        {v.rank_current != null && v.window_size != null && v.window_size > 0 ? (
          <div className={`text-sm font-medium ${
            v.rank_current / v.window_size > 0.8 ? 'text-red-600' :
            v.rank_current / v.window_size > 0.5 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {v.rank_current}/{v.window_size}
          </div>
        ) : <span className="text-sm text-muted-foreground">-</span>}
        <div className="text-xs text-muted-foreground">rang</div>
      </div>

      {/* Reasons */}
      <div className="flex-1 min-w-[150px]">
        {reasons.map((r, i) => (
          <div key={i} className="text-xs text-muted-foreground">• {r}</div>
        ))}
      </div>
    </div>
  );
};
