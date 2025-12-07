import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

// Placeholder data - will be replaced with real data from database
const mockHistoryData: ValuationRecord[] = [];

interface ValuationRecord {
  id: string;
  created_at: string;
  brand: string;
  model: string;
  build_year: number;
  mileage: number;
  trim: string;
  jp_cars_value: number;
  calculated_market_value: number;
  max_purchase_price: number;
  ai_recommendation: 'kopen' | 'niet_kopen' | 'twijfel';
  risk_score: number;
  created_by_name: string;
}

export function ValuationHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data] = useState<ValuationRecord[]>(mockHistoryData);

  const filteredData = data.filter(record => 
    `${record.brand} ${record.model}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'kopen':
        return <Badge className="bg-green-500 hover:bg-green-600"><TrendingUp className="mr-1 h-3 w-3" />Kopen</Badge>;
      case 'niet_kopen':
        return <Badge variant="destructive"><TrendingDown className="mr-1 h-3 w-3" />Niet kopen</Badge>;
      default:
        return <Badge variant="secondary">Twijfel</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Taxatie Historie
            </CardTitle>
            <CardDescription>
              Overzicht van alle uitgevoerde taxaties
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op merk/model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Geen taxaties gevonden</p>
            <p className="text-sm">Er zijn nog geen taxaties uitgevoerd. Start een nieuwe taxatie om te beginnen.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Voertuig</TableHead>
                  <TableHead>Uitvoering</TableHead>
                  <TableHead className="text-right">JP Cars Waarde</TableHead>
                  <TableHead className="text-right">Marktwaarde</TableHead>
                  <TableHead className="text-right">Max. Inkoop</TableHead>
                  <TableHead>Advies</TableHead>
                  <TableHead>Door</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((record) => (
                  <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {format(new Date(record.created_at), 'd MMM yyyy', { locale: nl })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.brand} {record.model}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.build_year} • {record.mileage.toLocaleString()} km
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{record.trim}</TableCell>
                    <TableCell className="text-right">{formatCurrency(record.jp_cars_value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(record.calculated_market_value)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(record.max_purchase_price)}
                    </TableCell>
                    <TableCell>{getRecommendationBadge(record.ai_recommendation)}</TableCell>
                    <TableCell className="text-muted-foreground">{record.created_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
