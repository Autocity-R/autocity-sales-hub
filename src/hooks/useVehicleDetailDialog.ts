import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle, LocationStatus, SalesStatus, ImportStatus, TransportStatus, WorkshopStatus, DamageStatus, PaymentStatus } from '@/types/inventory';

interface VehicleDetailDialogState {
  isOpen: boolean;
  vehicleId: string | null;
  defaultTab: string;
  vehicle: Vehicle | null;
  isLoading: boolean;
}

export const useVehicleDetailDialog = () => {
  const [state, setState] = useState<VehicleDetailDialogState>({
    isOpen: false,
    vehicleId: null,
    defaultTab: 'details',
    vehicle: null,
    isLoading: false
  });
  const queryClient = useQueryClient();

  const openVehicle = useCallback(async (vehicleId: string, tab: string = 'checklist') => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      vehicleId,
      defaultTab: tab,
      isLoading: true
    }));

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (error) throw error;
      
      const details = (data.details || {}) as Record<string, any>;
      const damage = (details.damage || {}) as Record<string, any>;
      
      // Transform to Vehicle type
      const vehicle: Vehicle = {
        id: data.id,
        brand: data.brand,
        model: data.model,
        color: data.color || undefined,
        licenseNumber: data.license_number || '',
        vin: data.vin || '',
        mileage: data.mileage || 0,
        location: (data.location || 'showroom') as LocationStatus,
        salesStatus: (data.status || 'voorraad') as SalesStatus,
        sellingPrice: data.selling_price || 0,
        purchasePrice: details.purchasePrice || data.purchase_price || 0,
        photos: details.photos || [],
        mainPhotoUrl: details.mainPhoto || null,
        damage: {
          description: damage.description || '',
          status: (damage.status || 'geen') as DamageStatus,
        },
        details: details,
        notes: data.notes || '',
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        deliveryDate: data.delivery_date ? new Date(data.delivery_date) : undefined,
        year: data.year || undefined,
        importStatus: (details.importStatus || 'niet_aangemeld') as ImportStatus,
        transportStatus: (details.transportStatus || 'onderweg') as TransportStatus,
        arrived: details.arrived || false,
        workshopStatus: (details.workshopStatus || 'wachten') as WorkshopStatus,
        showroomOnline: details.showroomOnline || false,
        bpmRequested: details.bpmRequested || false,
        bpmStarted: details.bpmStarted || false,
        paymentStatus: (details.paymentStatus || 'niet_betaald') as PaymentStatus,
        cmrSent: details.cmrSent || false,
        cmrDate: details.cmrDate ? new Date(details.cmrDate) : null,
        papersReceived: details.papersReceived || false,
        papersDate: details.papersDate ? new Date(details.papersDate) : null,
        supplierId: data.supplier_id || undefined,
        customerName: details.customerName,
        salespersonName: details.salespersonName,
      };

      setState(prev => ({
        ...prev,
        vehicle,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, []);

  const closeDialog = useCallback(() => {
    setState({
      isOpen: false,
      vehicleId: null,
      defaultTab: 'details',
      vehicle: null,
      isLoading: false
    });
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['branch-manager-dashboard'] });
  }, [queryClient]);

  return {
    isOpen: state.isOpen,
    vehicleId: state.vehicleId,
    defaultTab: state.defaultTab,
    vehicle: state.vehicle,
    isLoading: state.isLoading,
    openVehicle,
    closeDialog
  };
};
