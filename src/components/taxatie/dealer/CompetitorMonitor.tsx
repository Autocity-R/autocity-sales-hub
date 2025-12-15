import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Car, CheckCircle, BarChart3 } from 'lucide-react';
import { DealersManagement } from './competitor/DealersManagement';
import { VehicleInventory } from './competitor/VehicleInventory';
import { SoldVehicles } from './competitor/SoldVehicles';
import { CompetitorAnalytics } from './competitor/CompetitorAnalytics';

export const CompetitorMonitor = () => {
  const [selectedDealerId, setSelectedDealerId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('dealers');

  return (
    <div className="space-y-6">
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
