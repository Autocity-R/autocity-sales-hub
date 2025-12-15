import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Car, CheckCircle, BarChart3, Store } from 'lucide-react';
import { DealersManagement } from './competitor/DealersManagement';
import { VehicleInventory } from './competitor/VehicleInventory';
import { SoldVehicles } from './competitor/SoldVehicles';
import { CompetitorAnalytics } from './competitor/CompetitorAnalytics';
import { useCompetitorDealers } from '@/hooks/useCompetitorDealers';

export const CompetitorMonitor = () => {
  const [selectedDealerId, setSelectedDealerId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('dealers');
  const { dealers } = useCompetitorDealers();

  return (
    <div className="space-y-6">
      {/* Dealer Filter */}
      <div className="flex items-center gap-4">
        <Select 
          value={selectedDealerId || 'all'} 
          onValueChange={(v) => setSelectedDealerId(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[280px]">
            <Store className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Selecteer dealer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle dealers</SelectItem>
            {dealers.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedDealerId && (
          <span className="text-sm text-muted-foreground">
            Filter actief: {dealers.find(d => d.id === selectedDealerId)?.name}
          </span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dealers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Dealers
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Voorraad
          </TabsTrigger>
          <TabsTrigger value="sold" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Verkocht
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dealers" className="mt-6">
          <DealersManagement 
            onSelectDealer={setSelectedDealerId} 
            selectedDealerId={selectedDealerId}
          />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <VehicleInventory dealerId={selectedDealerId} />
        </TabsContent>

        <TabsContent value="sold" className="mt-6">
          <SoldVehicles dealerId={selectedDealerId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <CompetitorAnalytics dealerId={selectedDealerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
