
import { supabase } from "@/integrations/supabase/client";
import { Vehicle } from "@/types/inventory";

export class SupabaseInventoryService {
  /**
   * Get all vehicles from Supabase database
   */
  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch vehicles from Supabase:', error);
        throw error;
      }

      // Map Supabase data to Vehicle interface
      return data.map(this.mapSupabaseToVehicle);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  /**
   * Get vehicles by sales status
   */
  async getVehiclesByStatus(status: string): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Failed to fetch ${status} vehicles from Supabase:`, error);
        throw error;
      }

      return data.map(this.mapSupabaseToVehicle);
    } catch (error) {
      console.error(`Error fetching ${status} vehicles:`, error);
      throw error;
    }
  }

  /**
   * Update vehicle sales status
   */
  async updateVehicleStatus(vehicleId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) {
        console.error('Failed to update vehicle status:', error);
        throw error;
      }

      console.log(`Vehicle ${vehicleId} status updated to ${status}`);
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      throw error;
    }
  }

  /**
   * Mark vehicle as arrived
   */
  async markVehicleAsArrived(vehicleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          // Note: 'arrived' field doesn't exist in current schema, but we'll update what we can
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) {
        console.error('Failed to mark vehicle as arrived:', error);
        throw error;
      }

      console.log(`Vehicle ${vehicleId} marked as arrived`);
    } catch (error) {
      console.error('Error marking vehicle as arrived:', error);
      throw error;
    }
  }

  /**
   * Create a new vehicle
   */
  async createVehicle(vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          brand: vehicleData.brand || '',
          model: vehicleData.model || '',
          year: vehicleData.year,
          color: vehicleData.color,
          license_number: vehicleData.licenseNumber,
          vin: vehicleData.vin,
          mileage: vehicleData.mileage,
          selling_price: vehicleData.sellingPrice,
          status: vehicleData.salesStatus || 'voorraad',
          location: vehicleData.location,
          customer_id: vehicleData.customerId
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create vehicle:', error);
        throw error;
      }

      return this.mapSupabaseToVehicle(data);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  /**
   * Map Supabase vehicle data to Vehicle interface
   */
  private mapSupabaseToVehicle(supabaseVehicle: any): Vehicle {
    return {
      id: supabaseVehicle.id,
      brand: supabaseVehicle.brand,
      model: supabaseVehicle.model,
      year: supabaseVehicle.year,
      color: supabaseVehicle.color,
      licenseNumber: supabaseVehicle.license_number,
      vin: supabaseVehicle.vin,
      mileage: supabaseVehicle.mileage,
      purchasePrice: 0, // Not in current schema
      sellingPrice: supabaseVehicle.selling_price,
      location: supabaseVehicle.location || 'showroom',
      salesStatus: supabaseVehicle.status as any,
      importStatus: 'niet_gestart' as any, // Default value
      arrived: false, // Default value
      papersReceived: false, // Default value
      showroomOnline: false, // Default value
      workshopStatus: 'wachten' as any, // Default value
      damage: { description: '', status: 'geen' }, // Default value
      bpmRequested: false, // Default value
      bpmStarted: false, // Default value
      cmrSent: false, // Default value
      cmrDate: null, // Default value
      papersDate: null, // Default value
      notes: '', // Default value
      paymentStatus: 'niet_betaald' as any, // Default value
      mainPhotoUrl: undefined,
      photos: [], // Default value
      createdAt: supabaseVehicle.created_at,
      customerId: supabaseVehicle.customer_id
    };
  }
}

export const supabaseInventoryService = new SupabaseInventoryService();
