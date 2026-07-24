import React from "react";
import { cn } from "@/lib/utils";

/**
 * Klassiek meervoudig schadeformulier: bovenaanzicht in het midden,
 * links vooraanzicht, rechts achteraanzicht, boven L-zijaanzicht, onder R-zijaanzicht.
 * Zone-IDs / -namen mappen 1-op-1 op `part` in work_orders / vehicle_intakes.points.
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

/**
 * Layout (viewBox 0 0 720 780):
 *  - TOP-view (main): x 240..480, y 30..750  (breedte 240, hoogte 720)
 *  - LEFT-side (L):   x 240..480, y 780..0 top strip? — hier boven top view geplaatst: y -140..-20? Nee.
 * Voor eenvoud: we plaatsen top-view in het midden en 4 kleinere silhouetten er omheen op een aparte
 * "damageform" layout: left side boven, right side onder, front links, rear rechts.
 */

export const DAMAGE_ZONES: DamageZone[] = [
  // ------------- TOP VIEW (bovenaanzicht) — center column (viewBox 720x780) -------------
  // Voorbumper met afgeronde neus
  { id: "voorbumper", name: "Voorbumper", shape: "polygon", points: "265,60 455,60 465,110 255,110" },
  { id: "grille", name: "Grille", shape: "rect", x: 320, y: 82, w: 80, h: 20 },
  { id: "koplamp_L", name: "Koplamp L", shape: "polygon", points: "270,70 305,70 315,95 265,95" },
  { id: "koplamp_R", name: "Koplamp R", shape: "polygon", points: "415,70 450,70 455,95 405,95" },
  { id: "motorkap", name: "Motorkap", shape: "polygon", points: "270,110 450,110 450,220 270,220" },
  { id: "voorruit", name: "Voorruit", shape: "polygon", points: "270,220 450,220 445,290 275,290" },
  { id: "dak", name: "Dak", shape: "polygon", points: "275,290 445,290 445,470 275,470" },
  { id: "achterruit", name: "Achterruit", shape: "polygon", points: "275,470 445,470 450,530 270,530" },
  { id: "achterklep", name: "Achterklep", shape: "polygon", points: "270,530 450,530 450,620 270,620" },
  { id: "achterbumper", name: "Achterbumper", shape: "polygon", points: "255,620 465,620 460,680 260,680" },
  { id: "achterlicht_L", name: "Achterlicht L", shape: "polygon", points: "260,625 305,625 305,655 260,655" },
  { id: "achterlicht_R", name: "Achterlicht R", shape: "polygon", points: "415,625 460,625 460,655 415,655" },
  // spatschermen + portieren links/rechts
  { id: "L_voorscherm", name: "L voorscherm", shape: "polygon", points: "255,110 275,110 275,220 245,220" },
  { id: "R_voorscherm", name: "R voorscherm", shape: "polygon", points: "445,110 465,110 475,220 445,220" },
  { id: "L_voorportier", name: "L voorportier", shape: "polygon", points: "245,220 275,220 275,380 245,380" },
  { id: "R_voorportier", name: "R voorportier", shape: "polygon", points: "445,220 475,220 475,380 445,380" },
  { id: "L_achterportier", name: "L achterportier", shape: "polygon", points: "245,380 275,380 275,470 245,470" },
  { id: "R_achterportier", name: "R achterportier", shape: "polygon", points: "445,380 475,380 475,470 445,470" },
  { id: "L_achterscherm", name: "L achterscherm", shape: "polygon", points: "245,470 275,470 270,620 250,620" },
  { id: "R_achterscherm", name: "R achterscherm", shape: "polygon", points: "445,470 475,470 470,620 450,620" },
  // dorpels
  { id: "L_dorpel", name: "L dorpel", shape: "rect", x: 232, y: 220, w: 13, h: 250 },
  { id: "R_dorpel", name: "R dorpel", shape: "rect", x: 475, y: 220, w: 13, h: 250 },
  // spiegels
  { id: "L_spiegel", name: "L buitenspiegel", shape: "ellipse", cx: 230, cy: 235, rx: 12, ry: 8 },
  { id: "R_spiegel", name: "R buitenspiegel", shape: "ellipse", cx: 490, cy: 235, rx: 12, ry: 8 },
  // velgen (kleine rondjes op de zijkanten van top view)
  { id: "velg_LV", name: "Velg L voor", shape: "circle", cx: 233, cy: 175, r: 12 },
  { id: "velg_RV", name: "Velg R voor", shape: "circle", cx: 487, cy: 175, r: 12 },
  { id: "velg_LA", name: "Velg L achter", shape: "circle", cx: 233, cy: 555, r: 12 },
  { id: "velg_RA", name: "Velg R achter", shape: "circle", cx: 487, cy: 555, r: 12 },
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
    if (z.shape === "ellipse") return { x: z.cx!, y: z.cy! };
    if (z.shape === "rect") return { x: (z.x! + z.w! / 2), y: (z.y! + z.h! / 2) };
    return { x: 360, y: 390 };
  };

  const renderZone = (z: DamageZone) => {
    const isSelected = selectedZoneId === z.id;
    const cls = cn(
      "transition-colors",
      interactive && "cursor-pointer",
      isSelected
        ? "fill-blue-500/60 stroke-blue-600"
        : "fill-white/70 stroke-slate-400 hover:fill-blue-50 hover:stroke-blue-500",
    );
    const strokeWidth = 1.3;
    const common = {
      className: cls,
      strokeWidth,
      onClick: interactive && onZoneClick ? () => onZoneClick(z) : undefined,
    };
    if (z.shape === "polygon") return <polygon key={z.id} points={z.points} {...common} />;
    if (z.shape === "circle") return <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r} {...common} />;
    if (z.shape === "ellipse") return <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} {...common} />;
    if (z.shape === "rect") return <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h} rx={2} {...common} />;
    return null;
  };

  return (
    <svg
      viewBox="0 0 720 780"
      className={cn("w-full h-auto select-none", compact ? "max-w-[200px]" : "", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ==== Formulier achtergrondlijnen ==== */}
      <g stroke="#e2e8f0" strokeWidth="1" fill="none">
        <line x1="230" y1="20" x2="230" y2="760" />
        <line x1="490" y1="20" x2="490" y2="760" />
      </g>

      {/* ==== TOP VIEW carrosserie-silhouet (achtergrond) ==== */}
      <path
        d="M 265 60 Q 360 30 455 60 L 465 110 L 488 220 L 488 470 L 470 620 L 465 680 Q 360 705 255 680 L 250 620 L 232 470 L 232 220 L 255 110 Z"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="1.5"
      />
      {/* raamlijn top */}
      <path d="M 275 290 L 445 290 L 445 470 L 275 470 Z" fill="#eef2f7" stroke="#cbd5e1" strokeWidth="1" />
      {/* portier-scheidingslijn */}
      <line x1="245" y1="380" x2="275" y2="380" stroke="#cbd5e1" />
      <line x1="445" y1="380" x2="475" y2="380" stroke="#cbd5e1" />

      {/* labels top view */}
      <text x="360" y="42" textAnchor="middle" fontSize="12" fontWeight="600" fill="#64748b" letterSpacing="2">VOOR</text>
      <text x="360" y="720" textAnchor="middle" fontSize="12" fontWeight="600" fill="#64748b" letterSpacing="2">ACHTER</text>
      <text x="185" y="390" textAnchor="middle" fontSize="10" fill="#94a3b8" transform="rotate(-90 185 390)" letterSpacing="2">LINKS</text>
      <text x="535" y="390" textAnchor="middle" fontSize="10" fill="#94a3b8" transform="rotate(90 535 390)" letterSpacing="2">RECHTS</text>

      {/* ==== Klikbare zones ==== */}
      {DAMAGE_ZONES.map(renderZone)}

      {/* raster/naden voor herkenbaarheid */}
      <g fill="none" stroke="#94a3b8" strokeWidth="0.8" opacity="0.5">
        <line x1="270" y1="110" x2="450" y2="110" />
        <line x1="270" y1="220" x2="450" y2="220" />
        <line x1="275" y1="290" x2="445" y2="290" />
        <line x1="275" y1="470" x2="445" y2="470" />
        <line x1="270" y1="530" x2="450" y2="530" />
        <line x1="270" y1="620" x2="450" y2="620" />
      </g>

      {/* ==== Mini FRONT view (links) ==== */}
      <g transform="translate(30,180)">
        <text x="90" y="-8" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b" letterSpacing="1">FRONT</text>
        <path d="M 20 90 Q 20 20 90 12 Q 160 20 160 90 L 160 130 L 20 130 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M 40 40 L 140 40 L 150 78 L 30 78 Z" fill="#eef2f7" stroke="#cbd5e1" strokeWidth="0.8" />
        <ellipse cx="45" cy="95" rx="14" ry="6" fill="#fff" stroke="#94a3b8" />
        <ellipse cx="135" cy="95" rx="14" ry="6" fill="#fff" stroke="#94a3b8" />
        <rect x="70" y="105" width="40" height="10" fill="#fff" stroke="#94a3b8" />
      </g>

      {/* ==== Mini REAR view (rechts) ==== */}
      <g transform="translate(510,180)">
        <text x="90" y="-8" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b" letterSpacing="1">ACHTER</text>
        <path d="M 20 90 Q 20 22 90 14 Q 160 22 160 90 L 160 130 L 20 130 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M 35 40 L 145 40 L 150 82 L 30 82 Z" fill="#eef2f7" stroke="#cbd5e1" strokeWidth="0.8" />
        <rect x="30" y="90" width="30" height="14" fill="#fff" stroke="#94a3b8" />
        <rect x="120" y="90" width="30" height="14" fill="#fff" stroke="#94a3b8" />
      </g>

      {/* ==== Mini SIDE view LEFT (boven) ==== */}
      <g transform="translate(60,470)">
        <text x="290" y="-8" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b" letterSpacing="1">ZIJKANT LINKS</text>
        <path d="M 10 90 Q 20 40 90 30 L 200 20 Q 350 20 500 40 L 560 60 L 560 100 L 10 100 Z"
              fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M 130 45 L 340 32 L 420 44 L 400 78 L 150 78 Z" fill="#eef2f7" stroke="#cbd5e1" strokeWidth="0.8" />
        <line x1="270" y1="35" x2="270" y2="78" stroke="#cbd5e1" />
        <circle cx="100" cy="100" r="20" fill="#fff" stroke="#94a3b8" strokeWidth="1.4" />
        <circle cx="100" cy="100" r="10" fill="#f1f5f9" stroke="#94a3b8" />
        <circle cx="470" cy="100" r="20" fill="#fff" stroke="#94a3b8" strokeWidth="1.4" />
        <circle cx="470" cy="100" r="10" fill="#f1f5f9" stroke="#94a3b8" />
      </g>

      {/* ==== Mini SIDE view RIGHT (onder) — gespiegeld ==== */}
      <g transform="translate(60,620)">
        <text x="290" y="-8" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b" letterSpacing="1">ZIJKANT RECHTS</text>
        <g transform="translate(570,0) scale(-1,1)">
          <path d="M 10 90 Q 20 40 90 30 L 200 20 Q 350 20 500 40 L 560 60 L 560 100 L 10 100 Z"
                fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
          <path d="M 130 45 L 340 32 L 420 44 L 400 78 L 150 78 Z" fill="#eef2f7" stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1="270" y1="35" x2="270" y2="78" stroke="#cbd5e1" />
          <circle cx="100" cy="100" r="20" fill="#fff" stroke="#94a3b8" strokeWidth="1.4" />
          <circle cx="100" cy="100" r="10" fill="#f1f5f9" stroke="#94a3b8" />
          <circle cx="470" cy="100" r="20" fill="#fff" stroke="#94a3b8" strokeWidth="1.4" />
          <circle cx="470" cy="100" r="10" fill="#f1f5f9" stroke="#94a3b8" />
        </g>
      </g>

      {/* ==== markers ==== */}
      {markers.map(m => {
        const z = DAMAGE_ZONES.find(x => x.id === m.zoneId);
        if (!z) return null;
        const { x, y } = zoneCenter(z);
        const r = compact ? 8 : 12;
        return (
          <g key={`m-${m.index}`}
             className={cn(onMarkerClick && "cursor-pointer")}
             onClick={onMarkerClick ? (e) => { e.stopPropagation(); onMarkerClick(m.index); } : undefined}>
            <circle cx={x} cy={y} r={r} fill="#dc2626" stroke="white" strokeWidth={compact ? 1.8 : 2.4} />
            <text x={x} y={y + (compact ? 3 : 4)} textAnchor="middle" fontSize={compact ? 10 : 14} fontWeight={700} fill="white">
              {m.index}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default DamageDiagram;