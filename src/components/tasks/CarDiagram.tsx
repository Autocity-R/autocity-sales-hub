import React from 'react';
import { cn } from '@/lib/utils';

export interface CarPart {
  id: string;
  name: string;
  path: string;
}

export const CAR_PARTS: CarPart[] = [
  { id: 'front_bumper', name: 'Voorbumper', path: 'M 100 40 L 200 40 L 200 60 L 100 60 Z' },
  { id: 'hood', name: 'Motorkap', path: 'M 100 60 L 200 60 L 200 140 L 100 140 Z' },
  { id: 'roof', name: 'Dak', path: 'M 100 140 L 200 140 L 200 260 L 100 260 Z' },
  { id: 'trunk', name: 'Kofferdeksel', path: 'M 100 260 L 200 260 L 200 340 L 100 340 Z' },
  { id: 'rear_bumper', name: 'Achterbumper', path: 'M 100 340 L 200 340 L 200 360 L 100 360 Z' },
  { id: 'left_front_fender', name: 'Linker spatbord voor', path: 'M 60 80 L 100 80 L 100 140 L 60 140 Z' },
  { id: 'left_front_door', name: 'Linker voordeur', path: 'M 60 140 L 100 140 L 100 200 L 60 200 Z' },
  { id: 'left_rear_door', name: 'Linker achterdeur', path: 'M 60 200 L 100 200 L 100 260 L 60 260 Z' },
  { id: 'left_rear_fender', name: 'Linker spatbord achter', path: 'M 60 260 L 100 260 L 100 320 L 60 320 Z' },
  { id: 'right_front_fender', name: 'Rechter spatbord voor', path: 'M 200 80 L 240 80 L 240 140 L 200 140 Z' },
  { id: 'right_front_door', name: 'Rechter voordeur', path: 'M 200 140 L 240 140 L 240 200 L 200 200 Z' },
  { id: 'right_rear_door', name: 'Rechter achterdeur', path: 'M 200 200 L 240 200 L 240 260 L 200 260 Z' },
  { id: 'right_rear_fender', name: 'Rechter spatbord achter', path: 'M 200 260 L 240 260 L 240 320 L 200 320 Z' },
  { id: 'left_mirror', name: 'Linker spiegel', path: 'M 40 130 L 60 130 L 60 150 L 40 150 Z' },
  { id: 'right_mirror', name: 'Rechter spiegel', path: 'M 240 130 L 260 130 L 260 150 L 240 150 Z' },
];

interface CarDiagramProps {
  selectedPartIds: string[];
  onPartClick: (partId: string) => void;
}

export const CarDiagram: React.FC<CarDiagramProps> = ({ selectedPartIds, onPartClick }) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <svg
        viewBox="0 0 300 400"
        className="w-full h-auto border border-border rounded-lg bg-background"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Car outline */}
        <rect x="100" y="40" width="100" height="320" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
        
        {/* Clickable parts */}
        {CAR_PARTS.map((part) => {
          const isSelected = selectedPartIds.includes(part.id);
          return (
            <g key={part.id}>
              <path
                d={part.path}
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  isSelected 
                    ? "fill-destructive/70 stroke-destructive" 
                    : "fill-muted/30 stroke-muted-foreground/50 hover:fill-muted/60 hover:stroke-muted-foreground"
                )}
                strokeWidth="1.5"
                onClick={() => onPartClick(part.id)}
              >
                <title>{part.name}</title>
              </path>
            </g>
          );
        })}
        
        {/* Labels */}
        <text x="150" y="25" textAnchor="middle" className="text-xs fill-muted-foreground" fontSize="12">
          Voor
        </text>
        <text x="150" y="390" textAnchor="middle" className="text-xs fill-muted-foreground" fontSize="12">
          Achter
        </text>
      </svg>
    </div>
  );
};
