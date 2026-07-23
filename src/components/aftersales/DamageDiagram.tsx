import React from "react";
import { cn } from "@/lib/utils";

/**
 * Top-view schematic damage diagram voor aftersales.
 * Zone-IDs mappen 1-op-1 op de `part`-waardes in work_orders / vehicle_intakes.points.
 */

export interface DamageZone {
  id: string;
  name: string; // exact zoals opgeslagen in work_orders.part
  shape: "polygon" | "circle" | "ellipse" | "rect";
  points?: string; // polygon
  cx?: number; cy?: number; r?: number; // circle
  rx?: number; ry?: number; // ellipse
  x?: number; y?: number; w?: number; h?: number; // rect
}

export const DAMAGE_ZONES: DamageZone[] = [
  // center stack front -> back
  { id: "voorbumper", name: "Voorbumper", shape: "polygon", points: "25,42 175,42 175,22 145,15 55,15 25,22" },
  { id: "motorkap", name: "Motorkap", shape: "polygon", points: "55,42 145,42 145,115 55,115" },
  { id: "voorruit", name: "Voorruit", shape: "polygon", points: "55,115 145,115 150,158 50,158" },
  { id: "dak", name: "Dak", shape: "polygon", points: "55,158 145,158 145,320 55,320" },
  { id: "achterruit", name: "Achterruit", shape: "polygon", points: "50,320 150,320 145,363 55,363" },
  { id: "achterklep", name: "Achterklep", shape: "polygon", points: "55,363 145,363 145,425 55,425" },
  { id: "achterbumper", name: "Achterbumper", shape: "polygon", points: "25,425 175,425 175,493 145,505 55,505 25,493" },
  // schermen / portieren
  { id: "L_voorscherm", name: "L voorscherm", shape: "polygon", points: "25,42 55,42 55,115 25,115" },
  { id: "R_voorscherm", name: "R voorscherm", shape: "polygon", points: "145,42 175,42 175,115 145,115" },
  { id: "L_voorportier", name: "L voorportier", shape: "polygon", points: "25,158 55,158 55,238 25,238" },
  { id: "L_achterportier", name: "L achterportier", shape: "polygon", points: "25,238 55,238 55,320 25,320" },
  { id: "R_voorportier", name: "R voorportier", shape: "polygon", points: "145,158 175,158 175,238 145,238" },
  { id: "R_achterportier", name: "R achterportier", shape: "polygon", points: "145,238 175,238 175,320 145,320" },
  { id: "L_achterscherm", name: "L achterscherm", shape: "polygon", points: "25,320 55,320 55,425 25,425" },
  { id: "R_achterscherm", name: "R achterscherm", shape: "polygon", points: "145,320 175,320 175,425 145,425" },
  // dorpels (dunne buitenstrip)
  { id: "L_dorpel", name: "L dorpel", shape: "rect", x: 15, y: 158, w: 10, h: 162 },
  { id: "R_dorpel", name: "R dorpel", shape: "rect", x: 175, y: 158, w: 10, h: 162 },
  // spiegels
  { id: "L_spiegel", name: "L buitenspiegel", shape: "circle", cx: 12, cy: 138, r: 7 },
  { id: "R_spiegel", name: "R buitenspiegel", shape: "circle", cx: 188, cy: 138, r: 7 },
  // velgen (4 hoeken)
  { id: "velg_LV", name: "Velg L voor", shape: "circle", cx: 8, cy: 88, r: 9 },
  { id: "velg_RV", name: "Velg R voor", shape: "circle", cx: 192, cy: 88, r: 9 },
  { id: "velg_LA", name: "Velg L achter", shape: "circle", cx: 8, cy: 395, r: 9 },
  { id: "velg_RA", name: "Velg R achter", shape: "circle", cx: 192, cy: 395, r: 9 },
];

export const findZoneByName = (name?: string | null): DamageZone | undefined =>
  DAMAGE_ZONES.find(z => z.name.toLowerCase() === (name || "").toLowerCase());

export interface DamageMarker {
  index: number; // 1-based
  zoneId: string;
}

interface Props {
  markers?: DamageMarker[];
  selectedZoneId?: string | null;
  onZoneClick?: (zone: DamageZone) => void;
  onMarkerClick?: (index: number) => void;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
}

export const DamageDiagram: React.FC<Props> = ({
  markers = [],
  selectedZoneId,
  onZoneClick,
  onMarkerClick,
  className,
  interactive = true,
  compact = false,
}) => {
  const zoneCenter = (z: DamageZone): { x: number; y: number } => {
    if (z.shape === "polygon" && z.points) {
      const pts = z.points.split(" ").map(p => p.split(",").map(Number));
      const cx = pts.reduce((a, [x]) => a + x, 0) / pts.length;
      const cy = pts.reduce((a, [, y]) => a + y, 0) / pts.length;
      return { x: cx, y: cy };
    }
    if (z.shape === "circle") return { x: z.cx!, y: z.cy! };
    if (z.shape === "rect") return { x: (z.x! + z.w! / 2), y: (z.y! + z.h! / 2) };
    return { x: 100, y: 260 };
  };

  const renderZone = (z: DamageZone) => {
    const isSelected = selectedZoneId === z.id;
    const cls = cn(
      "transition-colors",
      interactive && "cursor-pointer",
      isSelected
        ? "fill-blue-500/70 stroke-blue-600"
        : "fill-white stroke-slate-300 hover:fill-blue-50 hover:stroke-blue-400",
    );
    const strokeWidth = 1.2;
    const common = {
      className: cls,
      strokeWidth,
      onClick: interactive && onZoneClick ? () => onZoneClick(z) : undefined,
    };
    if (z.shape === "polygon") return <polygon key={z.id} points={z.points} {...common} />;
    if (z.shape === "circle") return <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r} {...common} />;
    if (z.shape === "rect") return <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h} rx={2} {...common} />;
    return null;
  };

  return (
    <svg
      viewBox="0 0 200 520"
      className={cn("w-full h-auto select-none", compact ? "max-w-[140px]" : "max-w-[360px]", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* body outline glow */}
      <rect x="20" y="12" width="160" height="500" rx="26" ry="26" fill="#f1f3f6" />
      {DAMAGE_ZONES.map(renderZone)}
      {/* markers */}
      {markers.map(m => {
        const z = DAMAGE_ZONES.find(x => x.id === m.zoneId);
        if (!z) return null;
        const { x, y } = zoneCenter(z);
        const r = compact ? 6 : 9;
        return (
          <g key={`m-${m.index}`}
             className={cn(onMarkerClick && "cursor-pointer")}
             onClick={onMarkerClick ? (e) => { e.stopPropagation(); onMarkerClick(m.index); } : undefined}>
            <circle cx={x} cy={y} r={r} fill="#dc2626" stroke="white" strokeWidth={compact ? 1.5 : 2} />
            <text x={x} y={y + (compact ? 2 : 3)} textAnchor="middle" fontSize={compact ? 8 : 11} fontWeight={700} fill="white">
              {m.index}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default DamageDiagram;