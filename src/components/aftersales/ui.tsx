import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

/**
 * Aftersales-only design primitives. Locally scoped, not shared with other roles.
 */

export const AsPage: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("min-h-full -mx-3 -my-3 md:-mx-4 md:-my-6 lg:-mx-6 px-3 md:px-6 py-4 md:py-6 bg-[#f6f7f9] font-sans text-slate-900", className)}
    style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto' }}
  >
    {children}
  </div>
);

export const AsCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}> = ({ children, className, onClick, interactive }) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-white rounded-[14px] border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)]",
      (interactive || onClick) && "cursor-pointer transition-shadow hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_28px_-14px_rgba(15,23,42,0.18)]",
      className,
    )}
  >
    {children}
  </div>
);

export const AsPill: React.FC<{
  tone?: "red" | "amber" | "green" | "violet" | "blue" | "slate" | "pink";
  children: React.ReactNode;
  className?: string;
}> = ({ tone = "slate", children, className }) => {
  const map: Record<string, string> = {
    red: "bg-red-50 text-red-700 border border-red-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    violet: "bg-violet-50 text-violet-700 border border-violet-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
    slate: "bg-slate-50 text-slate-600 border border-slate-200",
    pink: "bg-pink-50 text-pink-700 border border-pink-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-none whitespace-nowrap", map[tone], className)}>
      {children}
    </span>
  );
};

export const AsDot: React.FC<{ tone: "red" | "amber" | "green" | "violet" | "slate" }> = ({ tone }) => {
  const map: Record<string, string> = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-emerald-500",
    violet: "bg-violet-500",
    slate: "bg-slate-400",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", map[tone])} />;
};

export const AsVehicleThumb: React.FC<{ src?: string | null; className?: string }> = ({ src, className }) => (
  <div className={cn("bg-slate-100 rounded-md overflow-hidden flex items-center justify-center shrink-0", className)}>
    {src ? (
      // eslint-disable-next-line jsx-a11y/alt-text
      <img src={src} className="w-full h-full object-cover" />
    ) : (
      <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 17h14M6 17l1-6a2 2 0 012-2h6a2 2 0 012 2l1 6" />
        <circle cx="7" cy="17" r="1.5" /><circle cx="17" cy="17" r="1.5" />
      </svg>
    )}
  </div>
);

export const AsMono: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn("font-mono text-[11px] tracking-tight text-slate-500", className)}>{children}</span>
);

/** NL kentekenplaat-badge (geel). */
export const AsLicensePlate: React.FC<{ value?: string | null; size?: "sm" | "md" | "lg"; className?: string }> = ({ value, size = "md", className }) => {
  const sz = size === "sm" ? "text-[11px] px-1.5 py-0.5" : size === "lg" ? "text-[15px] px-2.5 py-1" : "text-[13px] px-2 py-0.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] bg-[#FFCD00] border border-black/70 font-black tracking-widest text-black font-mono uppercase shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]",
        sz,
        className,
      )}
    >
      {value || "—"}
    </span>
  );
};

export const AsSectionHead: React.FC<{ icon?: React.ReactNode; title: string; count?: number; right?: React.ReactNode }> = ({ icon, title, count, right }) => (
  <div className="flex items-center justify-between px-4 pt-4 pb-2">
    <div className="flex items-center gap-2.5">
      {icon && <div className="p-1.5 rounded-md bg-slate-100 text-slate-600">{icon}</div>}
      <div className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</div>
      {typeof count === "number" && (
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 tabular-nums">{count}</span>
      )}
    </div>
    {right}
  </div>
);

/**
 * Dashboard-kaart kop met betekenisvolle icoon-tegel, titel + subregel en grote teller rechts.
 * Vervangt AsSectionHead voor de aftersales-cockpit en lijstpagina's.
 */
export type AsTone = "blue" | "red" | "amber" | "green" | "violet" | "teal" | "slate" | "pink";

const TONE_ICON: Record<AsTone, string> = {
  blue: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  red: "bg-red-50 text-red-600 ring-1 ring-red-100",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  teal: "bg-teal-50 text-teal-700 ring-1 ring-teal-100",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  pink: "bg-pink-50 text-pink-700 ring-1 ring-pink-100",
};

export const AsCardHead: React.FC<{
  icon: React.ReactNode;
  tone?: AsTone;
  title: string;
  subtitle?: string;
  count?: number | string;
  right?: React.ReactNode;
}> = ({ icon, tone = "slate", title, subtitle, count, right }) => (
  <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
    <div className="flex items-start gap-3 min-w-0">
      <div className={cn("h-[34px] w-[34px] rounded-xl flex items-center justify-center shrink-0", TONE_ICON[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold tracking-tight text-slate-900 truncate">{title}</div>
        {subtitle && <div className="text-[11.5px] text-slate-500 truncate mt-0.5">{subtitle}</div>}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {right}
      {typeof count !== "undefined" && (
        <div className="text-[22px] font-extrabold tabular-nums text-slate-900 leading-none">{count}</div>
      )}
    </div>
  </div>
);

export const AsCardFoot: React.FC<{ label: string; onClick?: () => void; className?: string }> = ({ label, onClick, className }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    className={cn(
      "w-full flex items-center justify-between px-5 py-3 text-[12.5px] font-semibold text-blue-600 hover:text-blue-700 border-t border-slate-100 bg-slate-50/40",
      className,
    )}
  >
    <span>{label}</span>
    <ArrowRight className="h-3.5 w-3.5" />
  </button>
);

/** Wachttijd-format: <24u toont uren ("14u"), daarna dagen ("5 dgn", "31 dgn"). */
export const fmtWait = (hours: number): string => {
  if (hours < 24) return `${hours}u`;
  const d = Math.floor(hours / 24);
  return `${d} dgn`;
};

export function useLiveTimer(fromIso?: string | null) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!fromIso) return null;
  const s = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 1000));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}
