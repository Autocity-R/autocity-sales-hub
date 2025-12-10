import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, CheckCircle, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import type { BulkTaxatieResult } from '@/types/bulkTaxatie';
import { exportBulkTaxatieToExcel } from '@/services/bulkTaxatieExport';

interface BulkTaxatieResultsProps {
  results: BulkTaxatieResult[];
  onReset: () => void;
}

const getRecommendationBadge = (recommendation?: string) => {
  switch (recommendation) {
    case 'kopen':
      return <Badge className="bg-green-500 hover:bg-green-600">✓ KOPEN</Badge>;
    case 'niet_kopen':
      return <Badge variant="destructive">✗ NIET KOPEN</Badge>;
    case 'twijfel':
      return <Badge className="bg-amber-500 hover:bg-amber-600">? TWIJFEL</Badge>;
    default:
      return <Badge variant="secondary">-</Badge>;
  }
};

const getCourantheeidBadge = (courantheid?: string) => {
  switch (courantheid) {
    case 'hoog':
      return <Badge variant="outline" className="border-green-500 text-green-600">Hoog</Badge>;
    case 'laag':
      return <Badge variant="outline" className="border-red-500 text-red-600">Laag</Badge>;
    default:
      return <Badge variant="outline">Gemiddeld</Badge>;
  }
};

export const BulkTaxatieResults = ({ results, onReset }: BulkTaxatieResultsProps) => {
  const completedResults = results.filter(r => r.status === 'completed');
  const errorResults = results.filter(r => r.status === 'error');
  const kopenCount = completedResults.filter(r => r.aiAdvice?.recommendation === 'kopen').length;
  const nietKopenCount = completedResults.filter(r => r.aiAdvice?.recommendation === 'niet_kopen').length;
  const twijfelCount = completedResults.filter(r => r.aiAdvice?.recommendation === 'twijfel').length;

  const handleExport = () => {
    exportBulkTaxatieToExcel(results);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{completedResults.length}</div>
            <p className="text-sm text-muted-foreground">Succesvol</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{errorResults.length}</div>
            <p className="text-sm text-muted-foreground">Mislukt</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{kopenCount}</div>
            <p className="text-sm text-muted-foreground">✓ Kopen</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{twijfelCount}</div>
            <p className="text-sm text-muted-foreground">? Twijfel</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{nietKopenCount}</div>
            <p className="text-sm text-muted-foreground">✗ Niet Kopen</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Nieuwe Import
        </Button>
        <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
          <Download className="h-4 w-4 mr-2" />
          Exporteer naar Excel
        </Button>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resultaten</CardTitle>
          <CardDescription>
            Overzicht van alle getaxeerde voertuigen met AI advies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Voertuig</TableHead>
                  <TableHead className="text-right">Vraagprijs</TableHead>
                  <TableHead className="text-center">APR</TableHead>
                  <TableHead className="text-center">ETR</TableHead>
                  <TableHead className="text-center">Courantheid</TableHead>
                  <TableHead className="text-right">Max Inkoop</TableHead>
                  <TableHead className="text-right">Verw. Marge</TableHead>
                  <TableHead className="text-center">Advies</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow 
                    key={index}
                    className={
                      result.aiAdvice?.recommendation === 'kopen' ? 'bg-green-50 dark:bg-green-950/10' :
                      result.aiAdvice?.recommendation === 'niet_kopen' ? 'bg-red-50 dark:bg-red-950/10' :
                      result.aiAdvice?.recommendation === 'twijfel' ? 'bg-amber-50 dark:bg-amber-950/10' :
                      ''
                    }
                  >
                    <TableCell className="font-medium">{result.input.rowIndex}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{result.input.brand} {result.input.model}</span>
                        <div className="text-xs text-muted-foreground">
                          {result.input.buildYear} • {result.input.mileage?.toLocaleString()} km
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {result.input.askingPrice ? `€${result.input.askingPrice.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        (result.jpCarsData?.apr || 0) >= 4 ? 'default' :
                        (result.jpCarsData?.apr || 0) >= 3 ? 'secondary' : 'destructive'
                      }>
                        {result.jpCarsData?.apr || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        (result.jpCarsData?.etr || 0) >= 4 ? 'default' :
                        (result.jpCarsData?.etr || 0) >= 3 ? 'secondary' : 'destructive'
                      }>
                        {result.jpCarsData?.etr || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getCourantheeidBadge(result.jpCarsData?.courantheid)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {result.aiAdvice?.recommendedPurchasePrice 
                        ? `€${result.aiAdvice.recommendedPurchasePrice.toLocaleString()}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {result.aiAdvice?.targetMargin 
                        ? `${result.aiAdvice.targetMargin}%`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      {getRecommendationBadge(result.aiAdvice?.recommendation)}
                    </TableCell>
                    <TableCell className="text-center">
                      {result.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                      ) : result.status === 'error' ? (
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                      ) : result.status === 'processing' ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto animate-pulse" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
