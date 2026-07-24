import React from "react";
import { cn } from "@/lib/utils";

/**
 * Schadediagram in drie aanzichten (viewBox 900x1100):
 *   - Zijkant LINKS  (boven)   y   20..300
 *   - BOVENAANZICHT  (midden)  y  340..960  — auto rijdt naar boven (VOOR = boven)
 *   - Zijkant RECHTS (onder, gespiegeld) y 1000..1280? — nee: passen in 1100
 * Alle drie aanzichten zijn volledig klikbaar. Zone-IDs / -namen komen 1-op-1
 * terug in work_orders.part en vehicle_intakes.points.
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

/*
 * ============= COORDINATES =============
 *  viewBox 900 x 1100
 *  Row 1 — SIDE LEFT  (rijrichting naar rechts): y 40..300, x 40..860
 *  Row 2 — TOP VIEW   (auto rijdt naar boven):   center x 330..570, y 340..960
 *  Row 3 — SIDE RIGHT (gespiegeld — rijrichting naar links): y 1000..1260 ... 900 hoog te kort.
 *  → Verruim viewBox naar 900 x 1320.
 */

// ---- Side left helper (rijrichting → RECHTS) ----
// Basis-silhouet van x 40 tot 860 (breed 820), y-basis 40..300
// hoogte 260. Wiel-kasten rond y 260 (bodem).
const SL_Y0 = 40, SL_H = 260;

// ---- Side right (bottom): translate/scale wordt op group niveau gedaan ----
const SR_Y0 = 1020;

// ---- Top view ----
const TV_XL = 340, TV_XR = 560; // body left/right
const TV_YT = 360, TV_YB = 940;

// Helper: side-view zones (relatief aan y0)
const sideZones = (side: "L" | "R", y0: number): DamageZone[] => {
  const ids = (base: string) => `${side}_${base}`;
  const nm = (name: string) => `${side === "L" ? "L" : "R"} ${name}`;
  // Vertical anchors within the 260h side silhouette:
  //   y0..y0+40 = top (dak/pilaars/side ruiten bovenrand)
  //   y0+40..y0+140 = middenband (portieren/ruiten)
  //   y0+140..y0+230 = onderkant portieren / dorpel
  //   y0+230..y0+260 = wielkast/velg
  // Horizontally (in original / left orientation, rijdt naar rechts):
  //   40..170  = achter (achterbumper/achterlicht/achterscherm/velg achter)
  //   170..380 = achterportier + zijruit achter
  //   380..600 = voorportier + zijruit voor + spiegel
  //   600..760 = voorscherm + koplamp
  //   760..860 = voorbumper
  const y = (dy: number) => y0 + dy;
  return [
    // Achterbumper
    { id: ids("achterbumper"), name: nm("achterbumper"), shape: "polygon",
      points: `40,${y(150)} 90,${y(150)} 110,${y(230)} 40,${y(230)}` },
    // Achterlicht
    { id: ids("achterlicht"), name: nm("achterlicht"), shape: "polygon",
      points: `85,${y(110)} 130,${y(110)} 130,${y(150)} 85,${y(150)}` },
    // Achterscherm
    { id: ids("achterscherm"), name: nm("achterscherm"), shape: "polygon",
      points: `85,${y(70)} 200,${y(70)} 200,${y(230)} 110,${y(230)} 90,${y(150)} 85,${y(150)}` },
    // Zijruit achter (donker)
    { id: ids("zijruit_achter"), name: nm("zijruit achter"), shape: "polygon",
      points: `210,${y(30)} 380,${y(20)} 380,${y(70)} 210,${y(70)}` },
    // Achterportier
    { id: ids("achterportier"), name: nm("achterportier"), shape: "polygon",
      points: `210,${y(70)} 380,${y(70)} 380,${y(230)} 210,${y(230)}` },
    // Zijruit voor (donker)
    { id: ids("zijruit_voor"), name: nm("zijruit voor"), shape: "polygon",
      points: `390,${y(20)} 570,${y(20)} 590,${y(70)} 390,${y(70)}` },
    // Voorportier
    { id: ids("voorportier"), name: nm("voorportier"), shape: "polygon",
      points: `390,${y(70)} 590,${y(70)} 590,${y(230)} 390,${y(230)}` },
    // Spiegel
    { id: ids("spiegel"), name: nm("buitenspiegel"), shape: "ellipse",
      cx: 400, cy: y(58), rx: 14, ry: 8 },
    // Voorscherm
    { id: ids("voorscherm"), name: nm("voorscherm"), shape: "polygon",
      points: `600,${y(60)} 760,${y(50)} 780,${y(230)} 690,${y(230)} 600,${y(230)}` },
    // Koplamp
    { id: ids("koplamp"), name: nm("koplamp"), shape: "polygon",
      points: `730,${y(90)} 790,${y(85)} 820,${y(120)} 760,${y(125)}` },
    // Voorbumper
    { id: ids("voorbumper"), name: nm("voorbumper"), shape: "polygon",
      points: `790,${y(120)} 855,${y(140)} 855,${y(200)} 800,${y(230)} 780,${y(230)}` },
    // Dorpel
    { id: ids("dorpel"), name: nm("dorpel"), shape: "rect",
      x: 110, y: y(230), w: 690, h: 12 },
    // Velg achter (dubbele circle door renderer als 2 circles achtergrond)
    { id: ids("velg_achter"), name: nm("velg achter"), shape: "circle",
      cx: 145, cy: y(255), r: 30 },
    // Velg voor
    { id: ids("velg_voor"), name: nm("velg voor"), shape: "circle",
      cx: 705, cy: y(255), r: 30 },
  ];
};

// Top-view zones (auto rijdt naar boven; VOOR = boven, LINKS = links)
const topZones = (): DamageZone[] => {
  const xl = TV_XL, xr = TV_XR;
  return [
    { id: "voorbumper", name: "Voorbumper", shape: "polygon",
      points: `${xl+5},${TV_YT+10} ${xr-5},${TV_YT+10} ${xr+15},${TV_YT+60} ${xl-15},${TV_YT+60}` },
    { id: "motorkap", name: "Motorkap", shape: "polygon",
      points: `${xl-15},${TV_YT+60} ${xr+15},${TV_YT+60} ${xr+15},${TV_YT+180} ${xl-15},${TV_YT+180}` },
    { id: "voorruit", name: "Voorruit", shape: "polygon",
      points: `${xl-15},${TV_YT+180} ${xr+15},${TV_YT+180} ${xr+10},${TV_YT+250} ${xl-10},${TV_YT+250}` },
    { id: "dak", name: "Dak", shape: "polygon",
      points: `${xl-10},${TV_YT+250} ${xr+10},${TV_YT+250} ${xr+10},${TV_YT+430} ${xl-10},${TV_YT+430}` },
    { id: "achterruit", name: "Achterruit", shape: "polygon",
      points: `${xl-10},${TV_YT+430} ${xr+10},${TV_YT+430} ${xr+15},${TV_YT+500} ${xl-15},${TV_YT+500}` },
    { id: "achterklep", name: "Achterklep", shape: "polygon",
      points: `${xl-15},${TV_YT+500} ${xr+15},${TV_YT+500} ${xr+15},${TV_YT+560} ${xl-15},${TV_YT+560}` },
    { id: "achterbumper", name: "Achterbumper", shape: "polygon",
      points: `${xl-15},${TV_YT+560} ${xr+15},${TV_YT+560} ${xr-5},${TV_YT+590} ${xl+5},${TV_YT+590}` },
  ];
};

export const DAMAGE_ZONES: DamageZone[] = [
  ...sideZones("L", SL_Y0),
  ...topZones(),
  ...sideZones("R", SR_Y0),
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

  // helper: renders a side-view silhouette background (rijrichting → rechts) at y0
  const SideSilhouette: React.FC<{ y0: number }> = ({ y0 }) => {
    const y = (d: number) => y0 + d;
    return (
      <g>
        {/* body */}
        <path
          d={`M 40 ${y(200)} L 60 ${y(150)} L 90 ${y(150)} L 200 ${y(70)} Q 380 ${y(20)} 590 ${y(60)} L 760 ${y(50)} L 830 ${y(110)} L 855 ${y(140)} L 855 ${y(230)} L 40 ${y(230)} Z`}
          fill="#f1f4f9" stroke="#94a3b8" strokeWidth="1.4"
        />
        {/* wheel arches */}
        <path d={`M 115 ${y(240)} A 30 30 0 0 1 175 ${y(240)}`} fill="none" stroke="#94a3b8" strokeWidth="1.2" />
        <path d={`M 675 ${y(240)} A 30 30 0 0 1 735 ${y(240)}`} fill="none" stroke="#94a3b8" strokeWidth="1.2" />
        {/* wheel outer black tyres (double-circle) */}
        <circle cx={145} cy={y(255)} r={32} fill="#1e293b" />
        <circle cx={705} cy={y(255)} r={32} fill="#1e293b" />
        <circle cx={145} cy={y(255)} r={22} fill="#e2e8f0" stroke="#64748b" />
        <circle cx={705} cy={y(255)} r={22} fill="#e2e8f0" stroke="#64748b" />
        {/* glass tint (overlay under clickable zone shapes) */}
        <path d={`M 210 ${y(30)} L 380 ${y(20)} L 380 ${y(70)} L 210 ${y(70)} Z`} fill="#c9d5e2" opacity="0.55" />
        <path d={`M 390 ${y(20)} L 570 ${y(20)} L 590 ${y(70)} L 390 ${y(70)} Z`} fill="#c9d5e2" opacity="0.55" />
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 900 1320"
      className={cn("w-full h-auto select-none", compact ? "max-w-[220px]" : "", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ============ SIDE LEFT (boven) ============ */}
      <text x="450" y="30" textAnchor="middle" fontSize="14" fontWeight="700" fill="#334155" letterSpacing="3">ZIJKANT LINKS</text>
      <SideSilhouette y0={SL_Y0} />

      {/* ============ TOP VIEW (midden) ============ */}
      <text x="450" y="335" textAnchor="middle" fontSize="14" fontWeight="700" fill="#334155" letterSpacing="3">BOVENAANZICHT</text>
      <text x={TV_XL - 40} y={(TV_YT + TV_YB) / 2} textAnchor="middle" fontSize="11" fill="#94a3b8"
            transform={`rotate(-90 ${TV_XL - 40} ${(TV_YT + TV_YB) / 2})`} letterSpacing="2">LINKS</text>
      <text x={TV_XR + 40} y={(TV_YT + TV_YB) / 2} textAnchor="middle" fontSize="11" fill="#94a3b8"
            transform={`rotate(90 ${TV_XR + 40} ${(TV_YT + TV_YB) / 2})`} letterSpacing="2">RECHTS</text>
      <text x="450" y={TV_YT - 10} textAnchor="middle" fontSize="11" fill="#94a3b8" letterSpacing="2">VOOR</text>
      <text x="450" y={TV_YB + 20} textAnchor="middle" fontSize="11" fill="#94a3b8" letterSpacing="2">ACHTER</text>
      {/* body silhouette */}
      <path
        d={`M ${TV_XL+5} ${TV_YT+10} Q 450 ${TV_YT-20} ${TV_XR-5} ${TV_YT+10} L ${TV_XR+15} ${TV_YT+60} L ${TV_XR+15} ${TV_YT+560} L ${TV_XR+15} ${TV_YT+590} Q 450 ${TV_YT+620} ${TV_XL-15} ${TV_YT+590} L ${TV_XL-15} ${TV_YT+560} L ${TV_XL-15} ${TV_YT+60} Z`}
        fill="#f1f4f9" stroke="#94a3b8" strokeWidth="1.4"
      />
      {/* windshield/roof/rear-window tint */}
      <path d={`M ${TV_XL-10} ${TV_YT+250} L ${TV_XR+10} ${TV_YT+250} L ${TV_XR+10} ${TV_YT+430} L ${TV_XL-10} ${TV_YT+430} Z`} fill="#c9d5e2" opacity="0.6" />
      {/* spiegels op zijkant top-view */}
      {/* achter-nog-mirror as separate rendered zones below */}

      {/* ============ SIDE RIGHT (onder, gespiegeld) ============ */}
      <text x="450" y={SR_Y0 - 20} textAnchor="middle" fontSize="14" fontWeight="700" fill="#334155" letterSpacing="3">ZIJKANT RECHTS</text>
      {/* We spiegelen niet fysiek (om click-mapping stabiel te houden), maar tekenen de silhouette normaal
          en tonen kleine indicator dat rijrichting naar links is */}
      <g transform={`translate(900, 0) scale(-1, 1)`}>
        <SideSilhouette y0={SR_Y0} />
      </g>

      {/* ==== Klikbare zones ==== */}
      {DAMAGE_ZONES.map(z => {
        // Als de zone een R_-side zone is (y > SR_Y0), spiegelen we z voor rendering,
        // maar de original coords blijven kloppen omdat sideZones() ze al op SR_Y0 baseert
        // en we op group-niveau -1 scale doen.
        if (z.id.startsWith("R_")) {
          return (
            <g key={z.id} transform={`translate(900, 0) scale(-1, 1)`}>
              {renderZone(z)}
            </g>
          );
        }
        return <React.Fragment key={z.id}>{renderZone(z)}</React.Fragment>;
      })}

      {/* ==== markers ==== */}
      {markers.map(m => {
        const z = DAMAGE_ZONES.find(x => x.id === m.zoneId);
        if (!z) return null;
        const c = zoneCenter(z);
        // Mirror right-side markers to visual coordinates
        const x = z.id.startsWith("R_") ? (900 - c.x) : c.x;
        const y = c.y;
        const r = compact ? 10 : 14;
        return (
          <g key={`m-${m.index}`}
             className={cn(onMarkerClick && "cursor-pointer")}
             onClick={onMarkerClick ? (e) => { e.stopPropagation(); onMarkerClick(m.index); } : undefined}>
            <circle cx={x} cy={y} r={r} fill="#dc2626" stroke="white" strokeWidth={compact ? 2 : 2.8} />
            <text x={x} y={y + (compact ? 3 : 5)} textAnchor="middle" fontSize={compact ? 11 : 15} fontWeight={700} fill="white">
              {m.index}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default DamageDiagram;