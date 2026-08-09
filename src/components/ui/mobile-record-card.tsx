import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobiele kaartweergave voor lijst-/tabelpagina's.
 *
 * Reden van bestaan: onder het lg-breakpoint verbergt een tabel met 8-12 kolommen
 * het merendeel van de informatie achter horizontaal scrollen. Deze kaart toont de
 * essentie meteen, verticaal gestapeld, met duim-vriendelijke raakvlakken.
 * De desktoptabellen blijven ongewijzigd.
 */

export const MobileCardList: React.FC<{
  children: React.ReactNode;
  className?: string;
  empty?: React.ReactNode;
}> = ({ children, className, empty }) => {
  const hasChildren = React.Children.toArray(children).length > 0;
  if (!hasChildren && empty !== undefined) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return <div className={cn("w-full max-w-full space-y-2 p-2", className)}>{children}</div>;
};

export interface MobileField {
  label: string;
  value: React.ReactNode;
  /** Vol regel in plaats van halve kolom. */
  wide?: boolean;
  /** Nadruk op de waarde (bijv. prijs). */
  strong?: boolean;
}

interface MobileRecordCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Klein blok rechtsboven, bijv. prijs of kenteken. */
  aside?: React.ReactNode;
  badges?: React.ReactNode;
  fields?: (MobileField | null | false | undefined)[];
  /** Voetregel met acties; klikken hierin opent de kaart niet. */
  actions?: React.ReactNode;
  /** Selectie-checkbox e.d. links van de titel. */
  lead?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MobileRecordCard: React.FC<MobileRecordCardProps> = ({
  title,
  subtitle,
  aside,
  badges,
  fields,
  actions,
  lead,
  onClick,
  className,
}) => {
  const visible = (fields ?? []).filter(Boolean) as MobileField[];
  const clickable = !!onClick;

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "w-full max-w-full overflow-hidden rounded-xl border border-border bg-card p-3 text-left shadow-sm",
        clickable && "touch-manipulation active:bg-muted/60",
        className
      )}
    >
      <div className="flex items-start gap-2">
        {lead && (
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
            {lead}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight text-foreground">{title}</div>
          {subtitle && (
            <div className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {aside && <div className="shrink-0 text-right text-[13px] font-semibold">{aside}</div>}
        {clickable && !aside && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>

      {badges && <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div>}

      {visible.length > 0 && (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {visible.map((f, i) => (
            <div key={i} className={cn("min-w-0", f.wide && "col-span-2")}>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</dt>
              <dd
                className={cn(
                  "truncate text-[13px] text-foreground",
                  f.strong && "font-semibold"
                )}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {actions && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
};