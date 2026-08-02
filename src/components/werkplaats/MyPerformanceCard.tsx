import React from "react";
import { AsCard } from "@/components/aftersales/ui";
import { cn } from "@/lib/utils";
import { Timer, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMyWorkPerformance } from "@/hooks/useMyWorkPerformance";

const fmtDuration = (s: number) => {
  if (!s) return null;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} u ${m} min` : `${m} min`;
};

const Counter: React.FC<{
  label: string; value: number; sub?: string | null; accent?: boolean;
}> = ({ label, value, sub, accent }) => (
  <div className="flex-1 min-w-0 px-2 py-1 text-center md:text-left">
    <div className={cn("text-[26px] md:text-[32px] font-bold leading-none tabular-nums",
      accent ? "text-blue-600" : "text-slate-900")}>{value}</div>
    <div className="text-[11px] md:text-[12px] font-medium text-slate-500 mt-1 truncate">{label}</div>
    {sub && <div className="text-[10.5px] md:text-[11px] text-slate-400 mt-0.5 truncate">{sub}</div>}
  </div>
);

interface Props {
  discipline: "werkplaats" | "spuit";
  /** "klussen" (monteur) of "auto's" (schadeherstel) */
  variant?: "monteur" | "schade";
}

export const MyPerformanceCard: React.FC<Props> = ({ discipline, variant = "monteur" }) => {
  const { data, loading } = useMyWorkPerformance(discipline);
  const schade = variant === "schade";
  const diff = data.week - data.prevWeek;
  const worked = fmtDuration(data.secondsToday);

  return (
    <AsCard className="p-3 md:p-4 mb-4">
      <div className="flex items-center gap-2 mb-2 md:mb-3">
        <span className="text-[13px] md:text-[14px] font-semibold text-slate-900">💪 Mijn prestaties</span>
        {loading && <span className="text-[11px] text-slate-400">laden…</span>}
      </div>

      <div className="flex items-stretch divide-x divide-slate-100">
        <Counter
          label={schade ? "Auto's vandaag" : "Klussen vandaag"}
          value={data.today}
          accent
          sub={schade ? `${data.partsToday} ${data.partsToday === 1 ? "deel" : "delen"}` : undefined}
        />
        <Counter
          label="Deze week"
          value={data.week}
          sub={schade ? `${data.partsWeek} ${data.partsWeek === 1 ? "deel" : "delen"}` : undefined}
        />
        <Counter
          label="Deze maand"
          value={data.month}
          sub={schade ? `${data.partsMonth} ${data.partsMonth === 1 ? "deel" : "delen"}` : undefined}
        />
        {schade && (
          <Counter
            label="Afgekeurd (maand)"
            value={data.rejectedMonth}
          />
        )}
      </div>

      <div className="mt-2 md:mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] md:text-[12px]">
        <span className={cn("inline-flex items-center gap-1 font-medium",
          diff > 0 ? "text-emerald-600" : diff < 0 ? "text-slate-500" : "text-slate-400")}>
          {diff > 0 ? <TrendingUp className="h-3.5 w-3.5" />
            : diff < 0 ? <TrendingDown className="h-3.5 w-3.5" />
            : <Minus className="h-3.5 w-3.5" />}
          {diff === 0 ? "gelijk aan vorige week"
            : `${Math.abs(diff)} ${diff > 0 ? "meer" : "minder"} dan vorige week`}
        </span>
        {worked && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Timer className="h-3.5 w-3.5" /> {worked} gewerkt vandaag
          </span>
        )}
        {!loading && data.today === 0 && (
          <span className="text-slate-400">
            {schade ? "Nog geen auto's vandaag — pak er één op 💪" : "Nog geen klussen vandaag — pak er één uit de pot 💪"}
          </span>
        )}
        {schade && data.rejectedMonth > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
            {data.rejectedMonth} teruggestuurd deze maand
          </span>
        )}
      </div>
    </AsCard>
  );
};

export default MyPerformanceCard;
