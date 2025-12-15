import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, RotateCcw, ChevronDown, ExternalLink, Building2, TrendingUp, Clock, AlertCircle, Mail, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { DealerAnalysisResult, DealerListing, VehicleInput } from '@/types/dealerAnalysis';
import { exportDealerAnalysisToExcel } from '@/services/dealerAnalysisExport';
import { toast } from 'sonner';
import { DealerEmailDialog } from './DealerEmailDialog';
import { BulkDealerEmailDialog, type SelectedDealerItem } from './BulkDealerEmailDialog';

interface DealerAnalysisResultsProps {
  results: DealerAnalysisResult[];
  onReset: () => void;
}

export const DealerAnalysisResults = ({ results, onReset }: DealerAnalysisResultsProps) => {
  const [openVehicles, setOpenVehicles] = useState<Set<number>>(new Set([0]));
  const [isExporting, setIsExporting] = useState(false);
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInput | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<DealerListing | null>(null);
  
  // Bulk email state
  const [selectedDealers, setSelectedDealers] = useState<Set<string>>(new Set());
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);

  const completedResults = results.filter(r => r.status === 'completed');
  const errorResults = results.filter(r => r.status === 'error');
  const totalDealers = completedResults.reduce((sum, r) => sum + r.dealers.length, 0);

  // Get all dealers with email for selection
  const dealersWithEmail = useMemo(() => {
    const dealers: SelectedDealerItem[] = [];
    completedResults.forEach((result, vIdx) => {
      result.dealers.forEach((dealer, dIdx) => {
        if (dealer.dealerEmail) {
          dealers.push({
            id: `${vIdx}-${dIdx}`,
            vehicle: result.vehicle,
            dealer
          });
        }
      });
    });
    return dealers;
  }, [completedResults]);

  const toggleVehicle = (index: number) => {
    const newOpen = new Set(openVehicles);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenVehicles(newOpen);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDealerAnalysisToExcel(results);
      toast.success('Excel bestand gedownload');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Fout bij exporteren');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenEmailDialog = (vehicle: VehicleInput, dealer: DealerListing) => {
    if (!dealer.dealerEmail) {
      toast.error('Geen email adres beschikbaar voor deze dealer');
      return;
    }
    setSelectedVehicle(vehicle);
    setSelectedDealer(dealer);
    setEmailDialogOpen(true);
  };

  // Bulk selection handlers
  const getDealerKey = (vIdx: number, dIdx: number) => `${vIdx}-${dIdx}`;

  const toggleDealerSelection = (vIdx: number, dIdx: number, dealer: DealerListing) => {
    if (!dealer.dealerEmail) return;
    
    const key = getDealerKey(vIdx, dIdx);
    const newSelected = new Set(selectedDealers);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedDealers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDealers.size === dealersWithEmail.length) {
      // Deselect all
      setSelectedDealers(new Set());
    } else {
      // Select all with email
      setSelectedDealers(new Set(dealersWithEmail.map(d => d.id)));
    }
  };

  const clearSelection = () => {
    setSelectedDealers(new Set());
  };

  const handleOpenBulkEmail = () => {
    if (selectedDealers.size === 0) {
      toast.error('Selecteer eerst dealers om te emailen');
      return;
    }
    setBulkEmailDialogOpen(true);
  };

  const handleRemoveDealerFromBulk = (id: string) => {
    const newSelected = new Set(selectedDealers);
    newSelected.delete(id);
    setSelectedDealers(newSelected);
    
    if (newSelected.size === 0) {
      setBulkEmailDialogOpen(false);
    }
  };

  const getSelectedDealerItems = (): SelectedDealerItem[] => {
    return dealersWithEmail.filter(d => selectedDealers.has(d.id));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatSoldSince = (days: number | null) => {
    if (days === null || days === 0) return 'Te koop';
    if (days === 1) return '1 dag geleden';
    return `${days} dgn geleden`;
  };

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dealer Analyse Resultaten
              </CardTitle>
              <CardDescription>
                {completedResults.length} voertuigen geanalyseerd, {totalDealers} dealers gevonden
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Nieuwe Analyse
              </Button>
              <Button onClick={handleExport} disabled={isExporting || totalDealers === 0}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporteren...' : 'Exporteer Excel'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{completedResults.length}</p>
              <p className="text-sm text-muted-foreground">Voertuigen</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{totalDealers}</p>
              <p className="text-sm text-muted-foreground">Dealers</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {completedResults.length > 0
                  ? formatPrice(
                      Math.round(
                        completedResults.reduce((sum, r) => sum + r.stats.avgPrice, 0) /
                          completedResults.length
                      )
                    )
                  : '-'}
              </p>
              <p className="text-sm text-muted-foreground">Gem. Prijs</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {completedResults.length > 0
                  ? Math.round(
                      completedResults.reduce((sum, r) => sum + r.stats.avgDaysInStock, 0) /
                        completedResults.length
                    )
                  : '-'}
              </p>
              <p className="text-sm text-muted-foreground">Gem. Stadagen</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk selection bar */}
      {dealersWithEmail.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedDealers.size === dealersWithEmail.length && dealersWithEmail.length > 0}
                    onCheckedChange={toggleSelectAll}
                    id="select-all"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Selecteer alle dealers met email ({dealersWithEmail.length})
                  </label>
                </div>
                {selectedDealers.size > 0 && (
                  <Badge variant="secondary">
                    {selectedDealers.size} geselecteerd
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedDealers.size > 0 && (
                  <>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Deselecteer
                    </Button>
                    <Button size="sm" onClick={handleOpenBulkEmail}>
                      <Users className="h-4 w-4 mr-2" />
                      Email naar {selectedDealers.size} dealer{selectedDealers.size > 1 ? 's' : ''}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error summary if any */}
      {errorResults.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {errorResults.length} voertuig(en) met fouten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {errorResults.map((r, idx) => (
                <p key={idx} className="text-sm text-muted-foreground">
                  {r.vehicle.brand} {r.vehicle.model}: {r.error}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle results */}
      <div className="space-y-4">
        {completedResults.map((result, vIdx) => (
          <Card key={vIdx}>
            <Collapsible open={openVehicles.has(vIdx)} onOpenChange={() => toggleVehicle(vIdx)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${
                          openVehicles.has(vIdx) ? 'rotate-180' : ''
                        }`}
                      />
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {result.vehicle.rowIndex && (
                            <Badge variant="outline" className="font-mono text-xs">#{result.vehicle.rowIndex}</Badge>
                          )}
                          {result.vehicle.brand} {result.vehicle.model} {result.vehicle.buildYear}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary">{result.vehicle.fuelType}</Badge>
                          <Badge variant="secondary">{result.vehicle.transmission}</Badge>
                          {result.vehicle.mileage && (
                            <Badge variant="secondary">{result.vehicle.mileage.toLocaleString('nl-NL')} km</Badge>
                          )}
                          {result.vehicle.licensePlate && (
                            <Badge variant="outline">{result.vehicle.licensePlate}</Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="font-bold">{result.dealers.length} dealers</p>
                        <p className="text-sm text-muted-foreground">
                          Gem. {formatPrice(result.stats.avgPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{result.stats.avgDaysInStock} dgn</span>
                      </div>
                      {result.stats.fastestSale !== null && result.stats.fastestSale > 0 && (
                        <Badge variant="default" className="bg-green-500">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Snelste: {result.stats.fastestSale}d
                        </Badge>
                      )}
                      {result.windowUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(result.windowUrl, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          JP Cars
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {result.dealers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Geen dealers gevonden voor dit voertuig
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Dealer</TableHead>
                          <TableHead className="text-right">Bouwjaar</TableHead>
                          <TableHead className="text-right">Prijs</TableHead>
                          <TableHead className="text-right">KM</TableHead>
                          <TableHead className="text-right">Stadagen</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                          <TableHead className="text-center">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.dealers.map((dealer, dIdx) => {
                          const dealerKey = getDealerKey(vIdx, dIdx);
                          const isSelected = selectedDealers.has(dealerKey);
                          const hasEmail = !!dealer.dealerEmail;
                          
                          return (
                            <TableRow 
                              key={dIdx}
                              className={isSelected ? 'bg-primary/5' : ''}
                            >
                              <TableCell>
                                {hasEmail && (
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleDealerSelection(vIdx, dIdx, dealer)}
                                    aria-label={`Selecteer ${dealer.dealerName}`}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{dealer.dealerName}</p>
                                  {dealer.dealerEmail && (
                                    <p className="text-xs text-muted-foreground">{dealer.dealerEmail}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{dealer.buildYear || '-'}</TableCell>
                              <TableCell className="text-right">{formatPrice(dealer.price)}</TableCell>
                              <TableCell className="text-right">
                                {dealer.mileage.toLocaleString('nl-NL')} km
                              </TableCell>
                              <TableCell className="text-right">{dealer.daysInStock}</TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    dealer.soldSince !== null && dealer.soldSince > 0 && dealer.soldSince <= 7
                                      ? 'text-green-600 font-medium'
                                      : dealer.soldSince !== null && dealer.soldSince > 7 && dealer.soldSince <= 30
                                      ? 'text-blue-600'
                                      : 'text-muted-foreground'
                                  }
                                >
                                  {formatSoldSince(dealer.soldSince)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {dealer.dealerEmail && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEmailDialog(result.vehicle, dealer)}
                                      title="Stuur B2B email"
                                    >
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {dealer.url && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(dealer.url, '_blank')}
                                      title="Open advertentie"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {!dealer.dealerEmail && !dealer.url && '-'}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Floating action bar when dealers are selected */}
      {selectedDealers.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-lg border-primary/20">
            <CardContent className="py-3 px-4 flex items-center gap-4">
              <Badge variant="default" className="text-sm">
                {selectedDealers.size} dealer{selectedDealers.size > 1 ? 's' : ''} geselecteerd
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Deselecteer
              </Button>
              <Button size="sm" onClick={handleOpenBulkEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Verstuur Bulk Email
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Single Email Dialog */}
      {selectedVehicle && selectedDealer && (
        <DealerEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          vehicle={selectedVehicle}
          dealer={selectedDealer}
          onSuccess={() => {
            setSelectedVehicle(null);
            setSelectedDealer(null);
          }}
        />
      )}

      {/* Bulk Email Dialog */}
      <BulkDealerEmailDialog
        open={bulkEmailDialogOpen}
        onOpenChange={setBulkEmailDialogOpen}
        selectedDealers={getSelectedDealerItems()}
        onRemoveDealer={handleRemoveDealerFromBulk}
        onSuccess={() => {
          clearSelection();
          setBulkEmailDialogOpen(false);
          toast.success('Alle emails zijn verstuurd!');
        }}
      />
    </div>
  );
};
