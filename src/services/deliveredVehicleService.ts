import { supabase } from "@/integrations/supabase/client";
import { Vehicle } from "@/types/inventory";

/**
 * Service for managing delivered vehicle operations
 */
export class DeliveredVehicleService {
  
  /**
   * Move a delivered vehicle back to a different status
   */
  async moveDeliveredVehicleBack(vehicleId: string, newStatus: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad'): Promise<void> {
    try {
      console.log(`Moving delivered vehicle ${vehicleId} back to status: ${newStatus}`);
      
      // Update the vehicle status and remove delivery date
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) {
        console.error('Failed to move delivered vehicle back:', error);
        throw error;
      }

      console.log(`Vehicle ${vehicleId} moved back to ${newStatus} successfully`);
    } catch (error) {
      console.error('Error moving delivered vehicle back:', error);
      throw error;
    }
  }

  /**
   * Get vehicle details including delivery information
   */
  async getDeliveredVehicleDetails(vehicleId: string): Promise<Vehicle | null> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          customer:contacts!vehicles_customer_id_fkey(first_name, last_name, company_name, email),
          supplier:contacts!vehicles_supplier_id_fkey(first_name, last_name, company_name, email)
        `)
        .eq('id', vehicleId)
        .eq('status', 'afgeleverd')
        .single();

      if (error) {
        console.error('Failed to fetch delivered vehicle details:', error);
        return null;
      }

      if (!data) return null;

      // Map the data to Vehicle interface
      const details = data.details as any || {};
      const customer = data.customer as any;
      const supplier = data.supplier as any;

      return {
        id: data.id,
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color,
        licenseNumber: data.license_number,
        vin: data.vin,
        mileage: data.mileage,
        sellingPrice: data.selling_price,
        purchasePrice: 0, // Add required field
        location: data.location || 'showroom',
        salesStatus: data.status,
        customerId: data.customer_id,
        supplierId: data.supplier_id,
        customerName: customer ? (customer.company_name || `${customer.first_name} ${customer.last_name}`.trim()) : null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        importStatus: data.import_status,
        notes: data.notes,
        arrived: true, // Add required field
        
        // Extract details
        workshopStatus: details.workshopStatus || 'wachten',
        paintStatus: details.paintStatus || 'geen_behandeling',
        transportStatus: details.transportStatus || 'onderweg',
        bpmRequested: details.bpmRequested || false,
        bpmStarted: details.bpmStarted || false,
        damage: details.damage || { description: '', status: 'geen' },
        cmrSent: details.cmrSent || false,
        cmrDate: details.cmrDate ? new Date(details.cmrDate) : null,
        papersReceived: details.papersReceived || false,
        papersDate: details.papersDate ? new Date(details.papersDate) : null,
        showroomOnline: details.showroomOnline || false,
        paymentStatus: details.paymentStatus || 'niet_betaald',
        salespersonId: details.salespersonId || null,
        salespersonName: details.salespersonName || null,
        mainPhotoUrl: details.mainPhotoUrl || null,
        photos: details.photos || [],
        deliveryDate: details.deliveryDate ? new Date(details.deliveryDate) : null,
      } as Vehicle;

    } catch (error) {
      console.error('Error fetching delivered vehicle details:', error);
      return null;
    }
  }
}

export const deliveredVehicleService = new DeliveredVehicleService();

/**
 * Fetch all delivered vehicles for warranty claims
 */
export const fetchDeliveredVehiclesForWarranty = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      customerContact:contacts!vehicles_customer_id_fkey(
        id,
        first_name,
        last_name,
        email,
        phone,
        company_name,
        type
      )
    `)
    .in('status', ['afgeleverd', 'verkocht_b2c', 'verkocht_b2b'])
    .not('customer_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching delivered vehicles:', error);
    throw new Error('Failed to fetch delivered vehicles');
  }

  // Map the data to Vehicle type
  const vehicles: Vehicle[] = (data || []).map(vehicleData => {
    const details = vehicleData.details as any || {};
    const customerContact = vehicleData.customerContact as any;
    
    return {
      id: vehicleData.id,
      brand: vehicleData.brand,
      model: vehicleData.model,
      year: vehicleData.year,
      color: vehicleData.color,
      licenseNumber: vehicleData.license_number,
      vin: vehicleData.vin,
      mileage: vehicleData.mileage,
      purchasePrice: details.purchase_price || 0,
      sellingPrice: vehicleData.selling_price,
      location: vehicleData.location || 'showroom',
      salesStatus: vehicleData.status,
      customerId: vehicleData.customer_id,
      supplierId: vehicleData.supplier_id,
      mainPhotoUrl: details.main_photo_url,
      photos: details.photos || [],
      importStatus: vehicleData.import_status,
      externalSheetReference: vehicleData.external_sheet_reference,
      deliveryDate: details.delivery_date ? new Date(details.delivery_date) : null,
      customerName: customerContact 
        ? customerContact.company_name || 
          `${customerContact.first_name} ${customerContact.last_name}`
        : undefined,
      customerEmail: customerContact?.email,
      customerPhone: customerContact?.phone,
      arrived: true,
      notes: vehicleData.notes,
      workshopStatus: details.workshopStatus || 'wachten',
      paintStatus: details.paintStatus || 'geen_behandeling',
      transportStatus: details.transportStatus || 'onderweg',
      bpmRequested: details.bpmRequested || false,
      bpmStarted: details.bpmStarted || false,
      damage: details.damage || { description: '', status: 'geen' },
      cmrSent: details.cmrSent || false,
      cmrDate: details.cmrDate ? new Date(details.cmrDate) : null,
      papersReceived: details.papersReceived || false,
      papersDate: details.papersDate ? new Date(details.papersDate) : null,
      showroomOnline: details.showroomOnline || false,
      paymentStatus: details.paymentStatus || 'niet_betaald',
      salespersonId: details.salespersonId || null,
      salespersonName: details.salespersonName || null,
    } as Vehicle;
  });

  return vehicles;
};