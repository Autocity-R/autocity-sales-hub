import React from "react";
import { cn } from "@/lib/utils";

/**
 * Schadediagram in drie aanzichten (viewBox 900x1320).
 * Beide zijaanzichten worden met de neus naar LINKS getekend (identieke oriëntatie);
 * kleine labels "VOOR" (links) en "ACHTER" (rechts) markeren de uiteinden.
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

// ---- Side-view baselines ----
//  Beide zijaanzichten identiek getekend, neus naar LINKS.
//  Silhouet occupeert x 40..860, hoogte ~260 (y0..y0+260).
const SL_Y0 = 60;   // zijkant LINKS (boven)
const SR_Y0 = 1020; // zijkant RECHTS (onder)

// ---- Top view ----
const TV_XL = 340, TV_XR = 560; // body left/right
const TV_YT = 360, TV_YB = 940;

// Helper: side-view zones (relatief aan y0). Neus links, achter rechts.
const sideZones = (side: "L" | "R", y0: number): DamageZone[] => {
  const ids = (base: string) => `${side}_${base}`;
  const nm = (name: string) => `${side === "L" ? "L" : "R"} ${name}`;
  const y = (dy: number) => y0 + dy;
  // Verticale ankers (silhouet 0..210):
  //   y+25          = dakrand
  //   y+92..95      = beltline (onderrand ruiten, bovenrand deuren)
  //   y+195         = onderrand deuren
  //   y+200..210    = dorpel + wielhoogte
  // Horizontaal (neus LINKS):
  //   40..90        = voorbumper
  //   90..250       = voorscherm + koplamp
  //   250..440      = voorportier + zijruit voor
  //   440..640      = achterportier + zijruit achter
  //   640..820      = achterscherm + achterlicht
  //   820..860      = achterbumper
  return [
    // Voorbumper (uiterst links)
    { id: ids("voorbumper"), name: nm("voorbumper"), shape: "polygon",
      points: `40,${y(130)} 60,${y(115)} 90,${y(105)} 90,${y(195)} 40,${y(195)}` },
    // Koplamp
    { id: ids("koplamp"), name: nm("koplamp"), shape: "polygon",
      points: `62,${y(112)} 118,${y(102)} 118,${y(128)} 62,${y(135)}` },
    // Voorscherm (boven voorwiel)
    { id: ids("voorscherm"), name: nm("voorscherm"), shape: "polygon",
      points: `90,${y(102)} 245,${y(94)} 245,${y(195)} 218,${y(195)} 218,${y(200)} 142,${y(200)} 142,${y(195)} 90,${y(195)}` },
    // Buitenspiegel (op A-stijl)
    { id: ids("spiegel"), name: nm("buitenspiegel"), shape: "ellipse",
      cx: 292, cy: y(88), rx: 15, ry: 9 },
    // Zijruit voor (tussen A- en B-stijl)
    { id: ids("zijruit_voor"), name: nm("zijruit voor"), shape: "polygon",
      points: `316,${y(28)} 438,${y(28)} 438,${y(92)} 258,${y(92)}` },
    // Voorportier
    { id: ids("voorportier"), name: nm("voorportier"), shape: "polygon",
      points: `250,${y(94)} 442,${y(94)} 442,${y(195)} 250,${y(195)}` },
    // Zijruit achter (tussen B- en C-stijl)
    { id: ids("zijruit_achter"), name: nm("zijruit achter"), shape: "polygon",
      points: `448,${y(28)} 568,${y(28)} 632,${y(92)} 448,${y(92)}` },
    // Achterportier
    { id: ids("achterportier"), name: nm("achterportier"), shape: "polygon",
      points: `446,${y(94)} 638,${y(94)} 638,${y(195)} 446,${y(195)}` },
    // Achterscherm (boven achterwiel)
    { id: ids("achterscherm"), name: nm("achterscherm"), shape: "polygon",
      points: `640,${y(94)} 815,${y(96)} 815,${y(195)} 738,${y(195)} 738,${y(200)} 662,${y(200)} 662,${y(195)} 640,${y(195)}` },
    // Achterlicht
    { id: ids("achterlicht"), name: nm("achterlicht"), shape: "polygon",
      points: `770,${y(100)} 815,${y(102)} 815,${y(128)} 770,${y(126)}` },
    // Achterbumper (uiterst rechts)
    { id: ids("achterbumper"), name: nm("achterbumper"), shape: "polygon",
      points: `818,${y(102)} 858,${y(120)} 858,${y(195)} 818,${y(195)}` },
    // Dorpel (dunne strip tussen wielen)
    { id: ids("dorpel"), name: nm("dorpel"), shape: "rect",
      x: 142, y: y(198), w: 596, h: 6 },
    // Velg voor
    { id: ids("velg_voor"), name: nm("velg voor"), shape: "circle",
      cx: 180, cy: y(210), r: 30 },
    // Velg achter
    { id: ids("velg_achter"), name: nm("velg achter"), shape: "circle",
      cx: 700, cy: y(210), r: 30 },
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
  /** Meerdere delen tegelijk blauw markeren (gebundelde orders). */
  selectedZoneIds?: string[];
  onZoneClick?: (zone: DamageZone) => void;
  onMarkerClick?: (index: number) => void;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
}

export const DamageDiagram: React.FC<Props> = ({
  markers = [],
  selectedZoneId,
  selectedZoneIds,
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
    const isSelected = selectedZoneId === z.id || (selectedZoneIds ?? []).includes(z.id);
    const cls = cn(
      "transition-colors",
      interactive && "cursor-pointer",
      isSelected
        ? "fill-blue-500/60 stroke-blue-600"
        : "fill-white/0 stroke-slate-400/70 hover:fill-blue-100/60 hover:stroke-blue-500",
    );
    const strokeWidth = 1.1;
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

  // helper: renders a professional side-view silhouette (neus LINKS) at y0
  const SideSilhouette: React.FC<{ y0: number }> = ({ y0 }) => {
    const y = (d: number) => y0 + d;
    return (
      <g>
        {/* Body-hoofdvorm — sedan silhouet, neus links */}
        <path
          d={
            `M 40 ${y(155)} ` +
            `Q 42 ${y(128)} 60 ${y(115)} ` +           // voorbumper afronding
            `L 92 ${y(100)} ` +                        // hoek naar motorkap
            `Q 165 ${y(88)} 250 ${y(92)} ` +           // motorkap (vloeiend)
            `L 310 ${y(25)} ` +                        // A-stijl
            `L 570 ${y(25)} ` +                        // dak
            `L 640 ${y(92)} ` +                        // C-stijl
            `Q 730 ${y(90)} 815 ${y(96)} ` +           // kofferdek
            `L 850 ${y(112)} ` +                       // achterhoek
            `Q 858 ${y(128)} 858 ${y(155)} ` +
            `L 858 ${y(200)} ` +
            `L 738 ${y(200)} ` +                       // naar achterwielkast
            `A 38 38 0 0 0 662 ${y(200)} ` +           // achterwielkast (naar boven)
            `L 218 ${y(200)} ` +                       // over dorpel
            `A 38 38 0 0 0 142 ${y(200)} ` +           // voorwielkast
            `L 40 ${y(200)} Z`
          }
          fill="#f4f6fb" stroke="#475569" strokeWidth="1.8" strokeLinejoin="round"
        />
        {/* Beltline (onderrand ruiten) */}
        <line x1={250} y1={y(94)} x2={640} y2={y(94)} stroke="#475569" strokeWidth="1.2" />
        {/* Greenhouse — ruiten getint */}
        <path d={`M 316 ${y(28)} L 438 ${y(28)} L 438 ${y(92)} L 258 ${y(92)} Z`} fill="#cbd5e1" opacity="0.55" />
        <path d={`M 448 ${y(28)} L 568 ${y(28)} L 632 ${y(92)} L 448 ${y(92)} Z`} fill="#cbd5e1" opacity="0.55" />
        {/* B-stijl tussen ruiten */}
        <line x1={443} y1={y(28)} x2={443} y2={y(92)} stroke="#475569" strokeWidth="1.6" />
        {/* Deurnaden (dunne verticale lijnen) */}
        <line x1={248} y1={y(94)} x2={248} y2={y(195)} stroke="#94a3b8" strokeWidth="1" />
        <line x1={444} y1={y(94)} x2={444} y2={y(195)} stroke="#94a3b8" strokeWidth="1" />
        <line x1={640} y1={y(94)} x2={640} y2={y(195)} stroke="#94a3b8" strokeWidth="1" />
        {/* Dorpel — smalle onderstrook */}
        <rect x={142} y={y(198)} width={596} height={6} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        {/* Wielen — dubbele cirkel met velg-spaken hint */}
        <circle cx={180} cy={y(210)} r={38} fill="#1e293b" />
        <circle cx={180} cy={y(210)} r={26} fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
        <circle cx={180} cy={y(210)} r={8} fill="#94a3b8" />
        <circle cx={700} cy={y(210)} r={38} fill="#1e293b" />
        <circle cx={700} cy={y(210)} r={26} fill="#e2e8f0" stroke="#475569" strokeWidth="1.2" />
        <circle cx={700} cy={y(210)} r={8} fill="#94a3b8" />
        {/* Deurgrepen (subtiel) */}
        <rect x={330} y={y(130)} width={38} height={5} rx={2} fill="#94a3b8" opacity="0.6" />
        <rect x={530} y={y(130)} width={38} height={5} rx={2} fill="#94a3b8" opacity="0.6" />
        {/* Koplamp-detail */}
        <path d={`M 62 ${y(112)} L 118 ${y(102)} L 118 ${y(128)} L 62 ${y(135)} Z`} fill="#fef3c7" opacity="0.55" stroke="#94a3b8" strokeWidth="0.8" />
        {/* Achterlicht-detail */}
        <path d={`M 770 ${y(100)} L 815 ${y(102)} L 815 ${y(128)} L 770 ${y(126)} Z`} fill="#fecaca" opacity="0.55" stroke="#94a3b8" strokeWidth="0.8" />
      </g>
    );
  };

  // Kleine "VOOR" / "ACHTER" labels aan de uiteinden van een zijaanzicht
  const SideEndLabels: React.FC<{ y0: number }> = ({ y0 }) => (
    <g>
      <text x={45} y={y0 + 18} fontSize="10" fill="#64748b" letterSpacing="1.5" fontWeight={600}>VOOR</text>
      <text x={855} y={y0 + 18} textAnchor="end" fontSize="10" fill="#64748b" letterSpacing="1.5" fontWeight={600}>ACHTER</text>
    </g>
  );

  return (
    <svg
      viewBox="0 0 900 1320"
      className={cn("w-full h-auto select-none touch-manipulation [-webkit-tap-highlight-color:transparent]", compact ? "max-w-[220px]" : "", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ============ SIDE LEFT (boven) ============ */}
      <text x="450" y="30" textAnchor="middle" fontSize="14" fontWeight="700" fill="#334155" letterSpacing="3">ZIJKANT LINKS</text>
      <SideEndLabels y0={SL_Y0} />
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
      {/* Beide zijaanzichten identiek getekend (neus LINKS) — geen spiegeling. */}
      <SideEndLabels y0={SR_Y0} />
      <SideSilhouette y0={SR_Y0} />

      {/* ==== Klikbare zones ==== */}
      {DAMAGE_ZONES.map(z => (
        <React.Fragment key={z.id}>{renderZone(z)}</React.Fragment>
      ))}

      {/* ==== markers ==== */}
      {markers.map(m => {
        const z = DAMAGE_ZONES.find(x => x.id === m.zoneId);
        if (!z) return null;
        const c = zoneCenter(z);
        const x = c.x;
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