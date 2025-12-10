import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Car, CheckCircle, XCircle, Clock } from 'lucide-react';

interface BulkTaxatieProgressProps {
  current: number;
  total: number;
  currentVehicle: string;
  completedCount: number;
  errorCount: number;
}

export const BulkTaxatieProgress = ({
  current,
  total,
  currentVehicle,
  completedCount,
  errorCount,
}: BulkTaxatieProgressProps) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const estimatedTimeLeft = (total - current) * 3; // ~3 seconds per vehicle

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Bulk Taxatie Bezig...
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Voortgang</span>
            <span className="font-medium">{current} / {total}</span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        {/* Current Vehicle */}
        <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
          <Car className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Nu verwerken:</p>
            <p className="font-medium">{currentVehicle || 'Voorbereiden...'}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div className="text-sm">
              <span className="font-medium">{completedCount}</span>
              <span className="text-muted-foreground ml-1">voltooid</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <div className="text-sm">
              <span className="font-medium">{errorCount}</span>
              <span className="text-muted-foreground ml-1">mislukt</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium">~{Math.ceil(estimatedTimeLeft / 60)}</span>
              <span className="text-muted-foreground ml-1">min resterend</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
