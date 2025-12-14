import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Building2, Car, TrendingUp, Clock, CheckCircle, ExternalLink, Download, Loader2, Star, History, X, Lightbulb, Users, FileSearch, AlertTriangle } from 'lucide-react';
import { useDealerSearch, DealerVehicle } from '@/hooks/useDealerSearch';
import { exportDealerSearchToExcel } from '@/services/dealerSearchExport';

// Suggested dealers for quick search
const SUGGESTED_DEALERS = [
  'Van Mossel',
  'Louwman',
  'Stern',
  'Van der Linde',
  'Broekhuis',
  'Muntstad',
];

export const CompetitorMonitor = () => {
  const [searchMode, setSearchMode] = useState<'plate' | 'name'>('plate');
  const [searchQuery, setSearchQuery] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const { results, lookupResult, isSearching, error, recentSearches, searchDealer, searchByLicensePlate, reset, clearRecentSearches } = useDealerSearch();

  const handleSearch = () => {
    if (searchMode === 'plate') {
      if (licensePlate.trim()) {
        searchByLicensePlate(licensePlate);
      }
    } else {
      if (searchQuery.trim()) {
        searchDealer(searchQuery);
      }
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
    // TODO: Add export for lookupResult
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

  // Check if we have any results to show
  const hasResults = results || lookupResult;
  const currentResult = lookupResult || results;

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
        <CardContent className="space-y-4">
          {/* Search Mode Tabs */}
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'plate' | 'name')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="plate" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Via Kenteken
                <Badge variant="secondary" className="ml-1 text-xs">Aanbevolen</Badge>
              </TabsTrigger>
              <TabsTrigger value="name" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Via Dealer Naam
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plate" className="mt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Voer een kenteken in van een auto die bij de concurrent te koop staat. 
                  We vinden dan de dealer en tonen vergelijkbare voertuigen.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Bijv. XX-123-YY of XX123YY"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      onKeyPress={handleKeyPress}
                      className="pl-10 font-mono"
                      disabled={isSearching}
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={isSearching || !licensePlate.trim()}>
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Zoeken...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Zoek Dealer
                      </>
                    )}
                  </Button>
                  {hasResults && (
                    <Button variant="outline" onClick={reset}>
                      Wissen
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="name" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    <strong>Let op:</strong> Zoeken op dealer naam is minder betrouwbaar. 
                    We raden aan om via kenteken te zoeken voor de beste resultaten.
                  </p>
                </div>
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
                  {hasResults && (
                    <Button variant="outline" onClick={reset}>
                      Wissen
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
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

      {/* Lookup Result (via license plate) */}
      {lookupResult && (
        <>
          {/* Success message */}
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Dealer gevonden: {lookupResult.dealerName}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {lookupResult.message}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{lookupResult.inStock.length}</p>
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
                    <p className="text-2xl font-bold">{formatPrice(lookupResult.stats.avgPrice)}</p>
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
                    <p className="text-2xl font-bold">{lookupResult.stats.avgStockDays} dgn</p>
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
                    <p className="text-2xl font-bold">{lookupResult.stats.soldLast30Days}</p>
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
                  <CardTitle>{lookupResult.dealerName}</CardTitle>
                  <CardDescription>
                    {lookupResult.totalVehicles} vergelijkbare voertuigen gevonden via kenteken {lookupResult.lookupLicensePlate}
                  </CardDescription>
                </div>
                {/* <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button> */}
              </div>
            </CardHeader>
            <CardContent>
              {lookupResult.stats.topBrands.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Top merken:</span>
                  {lookupResult.stats.topBrands.map(({ brand, count }) => (
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
                    Voorraad ({lookupResult.inStock.length})
                  </TabsTrigger>
                  <TabsTrigger value="sold" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verkocht ({lookupResult.sold.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="inStock" className="mt-4">
                  <VehicleTable vehicles={lookupResult.inStock} />
                </TabsContent>
                <TabsContent value="sold" className="mt-4">
                  <VehicleTable vehicles={lookupResult.sold} showSoldDays />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Note about window data */}
          <Card className="border-dashed">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                <strong>Let op:</strong> De getoonde voertuigen zijn vergelijkbare auto's uit de JP Cars window data. 
                Om meer voertuigen van deze dealer te ontdekken, probeer kentekens van verschillende type auto's.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Name Search Results */}
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

          {/* Multiple Dealers Found */}
          {results.uniqueDealers && results.uniqueDealers.length > 1 && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  {results.uniqueDealers.length} dealers gevonden
                </CardTitle>
                <CardDescription>
                  Je zoekopdracht "{results.searchQuery}" matchte meerdere dealers
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {results.uniqueDealers.map(({ name, count }) => (
                    <Button
                      key={name}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(name);
                        searchDealer(name);
                      }}
                      className="h-8"
                    >
                      {name}
                      <Badge variant="secondary" className="ml-2">
                        {count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Matched Variant Info */}
          {results.matchedVariant && results.matchedVariant !== results.searchQuery && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    Zoekopdracht "<strong>{results.searchQuery}</strong>" gematcht via variant "<strong>{results.matchedVariant}</strong>"
                  </span>
                </div>
                {results.triedVariants && results.triedVariants.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Geprobeerde varianten: {results.triedVariants.join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dealer Info & Top Brands */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{results.dealerName}</CardTitle>
                  <CardDescription>
                    Totaal {results.totalVehicles} voertuigen gevonden
                    {results.uniqueDealers && results.uniqueDealers.length > 1 && (
                      <span className="ml-1">bij {results.uniqueDealers.length} dealers</span>
                    )}
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

      {/* Empty state with suggestions */}
      {!hasResults && !isSearching && !error && (
        <div className="space-y-4">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recente zoekopdrachten
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearRecentSearches} className="h-8 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Wissen
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search) => (
                    <Button
                      key={`${search.dealerName}-${search.timestamp}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (search.method === 'plate') {
                          setSearchMode('plate');
                          setLicensePlate(search.query);
                          searchByLicensePlate(search.query);
                        } else {
                          setSearchMode('name');
                          setSearchQuery(search.dealerName);
                          searchDealer(search.dealerName);
                        }
                      }}
                      className="h-8"
                      title={search.method === 'plate' ? `Gezocht via kenteken: ${search.query}` : undefined}
                    >
                      {search.method === 'plate' && <FileSearch className="h-3 w-3 mr-1" />}
                      {search.dealerName}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {search.vehicleCount}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggested dealers (only for name search) */}
          {searchMode === 'name' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Populaire dealers
                </CardTitle>
                <CardDescription>Klik op een dealer om te zoeken</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_DEALERS.map((dealer) => (
                    <Button
                      key={dealer}
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(dealer);
                        searchDealer(dealer);
                      }}
                      className="h-8"
                    >
                      {dealer}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              {searchMode === 'plate' ? (
                <>
                  <FileSearch className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-medium mb-2">Zoek een dealer via kenteken</h3>
                  <p className="text-muted-foreground text-center max-w-md text-sm">
                    Voer een kenteken in van een auto die bij de concurrent te koop staat. 
                    We vinden de dealer en tonen vergelijkbare voertuigen uit hun voorraad.
                  </p>
                  <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm">
                    <strong>Tip:</strong> Ga naar de website van de concurrent en kopieer een kenteken van een auto die ze aanbieden.
                  </div>
                </>
              ) : (
                <>
                  <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-medium mb-2">Zoek een dealer</h3>
                  <p className="text-muted-foreground text-center max-w-md text-sm">
                    Voer een (deel van de) dealer naam in. JP Cars zoekt op gedeeltelijke match, 
                    dus "Van Mossel" vindt alle Van Mossel vestigingen.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No results found state */}
      {results && results.totalVehicles === 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center">
              <Search className="h-10 w-10 text-orange-500 mb-3" />
              <h3 className="text-lg font-medium mb-2">Geen voertuigen gevonden</h3>
              <p className="text-muted-foreground max-w-md text-sm mb-4">
                We konden geen voertuigen vinden voor "{results.searchQuery}".
              </p>
              
              {/* Show tried variants */}
              {results.triedVariants && results.triedVariants.length > 0 && (
                <div className="mb-4 p-3 rounded-md bg-white dark:bg-gray-900 border text-left w-full max-w-md">
                  <p className="text-xs text-muted-foreground mb-1">Geprobeerde zoekvarianten:</p>
                  <div className="flex flex-wrap gap-1">
                    {results.triedVariants.map((variant, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {variant}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-left bg-white dark:bg-gray-900 p-4 rounded-md border w-full max-w-md">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Tips voor betere resultaten:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Gebruik kenteken lookup</strong> - dit is betrouwbaarder</li>
                  <li>• Probeer de website domeinnaam (bijv. "vanrijswijkautos.nl")</li>
                  <li>• Zoek op alleen de achternaam (bijv. "rijswijk")</li>
                  <li>• Voeg "autos" toe (bijv. "rijswijkautos")</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
