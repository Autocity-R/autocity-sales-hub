import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2 
} from 'lucide-react';
import { useCompetitorDealers } from '@/hooks/useCompetitorDealers';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DealersManagementProps {
  onSelectDealer: (dealerId: string | undefined) => void;
  selectedDealerId?: string;
}

export function DealersManagement({ onSelectDealer, selectedDealerId }: DealersManagementProps) {
  const { 
    dealers, 
    isLoading, 
    addDealer, 
    deleteDealer, 
    updateDealer,
    scrapeDealer,
    isAddingDealer,
    isScraping 
  } = useCompetitorDealers();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDealerName, setNewDealerName] = useState('');
  const [newDealerUrl, setNewDealerUrl] = useState('');
  const [scrapingDealerId, setScrapingDealerId] = useState<string | null>(null);

  const handleAddDealer = () => {
    if (!newDealerName || !newDealerUrl) return;
    
    addDealer({
      name: newDealerName,
      scrape_url: newDealerUrl,
      website_url: new URL(newDealerUrl).origin,
      scrape_schedule: 'daily',
      scrape_time: '10:00:00',
      is_active: true,
      notes: null,
    });
    
    setNewDealerName('');
    setNewDealerUrl('');
    setIsAddDialogOpen(false);
  };

  const handleScrape = async (dealerId: string) => {
    setScrapingDealerId(dealerId);
    scrapeDealer(dealerId);
    // Reset after a delay (the mutation will handle the actual state)
    setTimeout(() => setScrapingDealerId(null), 30000);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Succes</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Fout</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Wachtend</Badge>;
      default:
        return <Badge variant="outline">Nog niet gescraped</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dealers Beheren</h3>
          <p className="text-sm text-muted-foreground">
            Voeg dealers toe en beheer hun scrape-instellingen
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Dealer Toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Dealer Toevoegen</DialogTitle>
              <DialogDescription>
                Voer de naam en AutoWereld URL van de dealer in
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dealerName">Dealer Naam</Label>
                <Input
                  id="dealerName"
                  placeholder="bijv. Autobedrijf Van Rijswijk"
                  value={newDealerName}
                  onChange={(e) => setNewDealerName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scrapeUrl">Scrape URL (AutoWereld)</Label>
                <Input
                  id="scrapeUrl"
                  placeholder="https://www.autowereld.nl/aanbieder/..."
                  value={newDealerUrl}
                  onChange={(e) => setNewDealerUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Gebruik de AutoWereld aanbieder pagina URL
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleAddDealer} disabled={isAddingDealer || !newDealerName || !newDealerUrl}>
                {isAddingDealer && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Toevoegen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dealer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Laatste Scrape</TableHead>
                <TableHead>Voertuigen</TableHead>
                <TableHead>Actief</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nog geen dealers toegevoegd. Klik op "Dealer Toevoegen" om te beginnen.
                  </TableCell>
                </TableRow>
              ) : (
                dealers.map((dealer) => (
                  <TableRow 
                    key={dealer.id} 
                    className={selectedDealerId === dealer.id ? 'bg-muted/50' : ''}
                    onClick={() => onSelectDealer(dealer.id === selectedDealerId ? undefined : dealer.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{dealer.name}</div>
                        <a 
                          href={dealer.scrape_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Bekijk op AutoWereld
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(dealer.last_scrape_status)}
                    </TableCell>
                    <TableCell>
                      {dealer.last_scraped_at ? (
                        <span className="text-sm">
                          {format(new Date(dealer.last_scraped_at), 'dd MMM HH:mm', { locale: nl })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{dealer.last_scrape_vehicles_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={dealer.is_active}
                        onCheckedChange={(checked) => {
                          updateDealer({ id: dealer.id, updates: { is_active: checked } });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScrape(dealer.id);
                          }}
                          disabled={scrapingDealerId === dealer.id || isScraping}
                        >
                          {scrapingDealerId === dealer.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">Scrape Nu</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Weet je zeker dat je "${dealer.name}" wilt verwijderen?`)) {
                              deleteDealer(dealer.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedDealerId && (
        <p className="text-sm text-muted-foreground">
          Geselecteerde dealer wordt gebruikt als filter in de andere tabs
        </p>
      )}
    </div>
  );
}
