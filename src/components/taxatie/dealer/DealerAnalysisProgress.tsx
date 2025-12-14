import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search } from 'lucide-react';

interface DealerAnalysisProgressProps {
  current: number;
  total: number;
  currentVehicle: string;
}

export const DealerAnalysisProgress = ({
  current,
  total,
  currentVehicle,
}: DealerAnalysisProgressProps) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Dealer Analyse Bezig...
        </CardTitle>
        <CardDescription>
          Zoeken naar dealers die recent vergelijkbare voertuigen hebben verkocht
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Voortgang</span>
            <span>
              {current} / {total} voertuigen
            </span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="font-medium">Huidige analyse:</p>
            <p className="text-muted-foreground">{currentVehicle || 'Starten...'}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Dit kan enkele minuten duren afhankelijk van het aantal voertuigen
        </p>
      </CardContent>
    </Card>
  );
};
