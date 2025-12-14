import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Building2, Car, TrendingUp, Clock, CheckCircle, ExternalLink, Download, Loader2, Star } from 'lucide-react';
import { useDealerSearch, DealerVehicle } from '@/hooks/useDealerSearch';
import { exportDealerSearchToExcel } from '@/services/dealerSearchExport';

export const CompetitorMonitor = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { results, isSearching, error, searchDealer, reset } = useDealerSearch();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchDealer(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleExport = () => {
    if (results) {
      exportDealerSearchToExcel(results);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
  };

  const formatMileage = (km: number) => {
    return new Intl.NumberFormat('nl-NL').format(km) + ' km';
  };

  const renderAPR = (apr: number) => {
    const stars = Math.min(5, Math.max(1, Math.round(apr)));
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        ))}
        {Array.from({ length: 5 - stars }).map((_, i) => (
          <Star key={i} className="h-3 w-3 text-muted-foreground/30" />
        ))}
      </div>
    );
  };

  const VehicleTable = ({ vehicles, showSoldDays = false }: { vehicles: DealerVehicle[], showSoldDays?: boolean }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kenteken</TableHead>
            <TableHead>Merk</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Bouwjaar</TableHead>
            <TableHead>KM-stand</TableHead>
            <TableHead className="text-right">Prijs</TableHead>
            <TableHead className="text-center">{showSoldDays ? 'Verkocht' : 'Stadagen'}</TableHead>
            <TableHead>APR</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                Geen voertuigen gevonden
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((vehicle, idx) => (
              <TableRow key={`${vehicle.licensePlate}-${idx}`}>
                <TableCell className="font-mono text-sm">{vehicle.licensePlate || '-'}</TableCell>
                <TableCell className="font-medium">{vehicle.brand}</TableCell>
                <TableCell>{vehicle.model}</TableCell>
                <TableCell>{vehicle.buildYear || '-'}</TableCell>
                <TableCell>{vehicle.mileage ? formatMileage(vehicle.mileage) : '-'}</TableCell>
                <TableCell className="text-right font-medium">{vehicle.price ? formatPrice(vehicle.price) : '-'}</TableCell>
                <TableCell className="text-center">
                  {showSoldDays ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {vehicle.soldSince} dgn
                    </Badge>
                  ) : (
                    <Badge variant={vehicle.stockDays > 60 ? 'destructive' : vehicle.stockDays > 30 ? 'secondary' : 'default'}>
                      {vehicle.stockDays} dgn
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{renderAPR(vehicle.apr)}</TableCell>
                <TableCell>
                  {vehicle.url && (
                    <a href={vehicle.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            Concurrentie Monitor
          </CardTitle>
          <CardDescription>
            Zoek een dealer en bekijk hun huidige voorraad en verkochte auto's via JP Cars
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op dealer naam (bijv. Van Mossel, Louwman)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
                disabled={isSearching}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Zoeken...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Zoeken
                </>
              )}
            </Button>
            {results && (
              <Button variant="outline" onClick={reset}>
                Wissen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && !isSearching && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{results.inStock.length}</p>
                    <p className="text-sm text-muted-foreground">In voorraad</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{formatPrice(results.stats.avgPrice)}</p>
                    <p className="text-sm text-muted-foreground">Gem. prijs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{results.stats.avgStockDays} dgn</p>
                    <p className="text-sm text-muted-foreground">Gem. stadagen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{results.stats.soldLast30Days}</p>
                    <p className="text-sm text-muted-foreground">Verkocht (30d)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dealer Info & Top Brands */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{results.dealerName}</CardTitle>
                  <CardDescription>
                    Totaal {results.totalVehicles} voertuigen gevonden
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {results.stats.topBrands.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Top merken:</span>
                  {results.stats.topBrands.map(({ brand, count }) => (
                    <Badge key={brand} variant="secondary">
                      {brand} ({count})
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Tabs */}
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="inStock">
                <TabsList>
                  <TabsTrigger value="inStock" className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Voorraad ({results.inStock.length})
                  </TabsTrigger>
                  <TabsTrigger value="sold" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verkocht ({results.sold.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="inStock" className="mt-4">
                  <VehicleTable vehicles={results.inStock} />
                </TabsContent>
                <TabsContent value="sold" className="mt-4">
                  <VehicleTable vehicles={results.sold} showSoldDays />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!results && !isSearching && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Zoek een dealer</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Voer een dealer naam in om hun huidige voorraad en recente verkopen te bekijken.
              Je kunt zoeken op (delen van) de bedrijfsnaam.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
