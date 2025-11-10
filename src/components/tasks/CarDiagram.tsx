import React from 'react';
import { cn } from '@/lib/utils';

export interface CarPart {
  id: string;
  name: string;
  path: string;
}

export const CAR_PARTS: CarPart[] = [
  // Voorbumper - afgeronde vorm
  { id: 'front_bumper', name: 'Voorbumper', path: 'M 120 30 Q 150 20 180 30 L 180 45 L 120 45 Z' },
  
  // Motorkap - trapezium met lichte curve
  { id: 'hood', name: 'Motorkap', path: 'M 115 45 L 185 45 L 180 95 L 120 95 Z' },
  
  // Voorruit/A-stijl gebied
  { id: 'windshield', name: 'Voorruit', path: 'M 120 95 L 180 95 L 175 125 L 125 125 Z' },
  
  // Dak - langwerpig
  { id: 'roof', name: 'Dak', path: 'M 125 125 L 175 125 L 175 245 L 125 245 Z' },
  
  // Achterruit/C-stijl
  { id: 'rear_windshield', name: 'Achterruit', path: 'M 125 245 L 175 245 L 180 275 L 120 275 Z' },
  
  // Kofferdeksel
  { id: 'trunk', name: 'Kofferdeksel', path: 'M 120 275 L 180 275 L 185 325 L 115 325 Z' },
  
  // Achterbumper
  { id: 'rear_bumper', name: 'Achterbumper', path: 'M 120 325 L 180 325 Q 150 335 120 325 Z' },
  
  // Linker spatbord voor
  { id: 'left_front_fender', name: 'Linker spatbord voor', path: 'M 75 60 Q 70 80 75 100 L 115 100 L 115 60 Z' },
  
  // Linker voordeur
  { id: 'left_front_door', name: 'Linker voordeur', path: 'M 75 105 L 115 105 L 115 175 L 75 175 Z' },
  
  // Linker achterdeur
  { id: 'left_rear_door', name: 'Linker achterdeur', path: 'M 75 180 L 115 180 L 115 250 L 75 250 Z' },
  
  // Linker spatbord achter
  { id: 'left_rear_fender', name: 'Linker spatbord achter', path: 'M 75 255 Q 70 275 75 295 L 115 295 L 115 255 Z' },
  
  // Rechter spatbord voor
  { id: 'right_front_fender', name: 'Rechter spatbord voor', path: 'M 185 60 L 225 60 Q 230 80 225 100 L 185 100 Z' },
  
  // Rechter voordeur
  { id: 'right_front_door', name: 'Rechter voordeur', path: 'M 185 105 L 225 105 L 225 175 L 185 175 Z' },
  
  // Rechter achterdeur
  { id: 'right_rear_door', name: 'Rechter achterdeur', path: 'M 185 180 L 225 180 L 225 250 L 185 250 Z' },
  
  // Rechter spatbord achter
  { id: 'right_rear_fender', name: 'Rechter spatbord achter', path: 'M 185 255 L 225 255 Q 230 275 225 295 L 185 295 Z' },
  
  // Wielen/Velgen (cirkels)
  { id: 'left_front_wheel', name: 'Linker voorwiel', path: 'M 55 80 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0' },
  { id: 'right_front_wheel', name: 'Rechter voorwiel', path: 'M 245 80 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0' },
  { id: 'left_rear_wheel', name: 'Linker achterwiel', path: 'M 55 275 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0' },
  { id: 'right_rear_wheel', name: 'Rechter achterwiel', path: 'M 245 275 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0' },
  
  // Spiegels (kleine cirkels)
  { id: 'left_mirror', name: 'Linker spiegel', path: 'M 65 135 m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0' },
  { id: 'right_mirror', name: 'Rechter spiegel', path: 'M 235 135 m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0' },
];

interface CarDiagramProps {
  selectedPartIds: string[];
  onPartClick: (partId: string) => void;
}

export const CarDiagram: React.FC<CarDiagramProps> = ({ selectedPartIds, onPartClick }) => {
  return (
    <div className="w-full max-w-lg mx-auto">
      <svg
        viewBox="0 0 300 370"
        className="w-full h-auto border border-border rounded-lg bg-background shadow-sm"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
          </filter>
        </defs>
        
        {/* Auto outline - achtergrond */}
        <g className="car-outline" stroke="hsl(var(--muted-foreground))" strokeWidth="2" fill="none" opacity="0.3">
          {/* Hoofd carrosserie */}
          <path d="M 120 30 Q 150 20 180 30 L 185 45 L 185 325 Q 150 335 115 325 L 115 45 Z" />
          
          {/* Linker zijde */}
          <path d="M 75 60 Q 70 80 75 100 L 75 255 Q 70 275 75 295 L 115 295 L 115 60 Z" />
          
          {/* Rechter zijde */}
          <path d="M 185 60 L 225 60 Q 230 80 225 100 L 225 255 Q 230 275 225 295 L 185 295 L 185 60 Z" />
          
          {/* Wielen cirkels als outline */}
          <circle cx="55" cy="80" r="18" />
          <circle cx="245" cy="80" r="18" />
          <circle cx="55" cy="275" r="18" />
          <circle cx="245" cy="275" r="18" />
        </g>
        
        {/* Clickable parts */}
        {CAR_PARTS.map((part) => {
          const isSelected = selectedPartIds.includes(part.id);
          const isWheel = part.id.includes('wheel');
          
          return (
            <g key={part.id}>
              <path
                d={part.path}
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  isSelected 
                    ? "fill-destructive/70 stroke-destructive stroke-2" 
                    : isWheel
                      ? "fill-muted/20 stroke-muted-foreground hover:fill-muted/50"
                      : "fill-muted/30 stroke-muted-foreground/50 hover:fill-muted/60 hover:stroke-muted-foreground"
                )}
                strokeWidth={isSelected ? "2" : "1.5"}
                onClick={() => onPartClick(part.id)}
                filter={isSelected ? "url(#shadow)" : ""}
              >
                <title>{part.name}</title>
              </path>
            </g>
          );
        })}
        
        {/* Labels */}
        <text x="150" y="15" textAnchor="middle" className="text-xs fill-muted-foreground font-semibold" fontSize="12">
          VOOR
        </text>
        <text x="150" y="360" textAnchor="middle" className="text-xs fill-muted-foreground font-semibold" fontSize="12">
          ACHTER
        </text>
      </svg>
      
      {/* Legenda */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted/30 border border-muted-foreground/50" />
          <span>Niet geselecteerd</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/70 border border-destructive" />
          <span>Beschadigd</span>
        </div>
      </div>
    </div>
  );
};
