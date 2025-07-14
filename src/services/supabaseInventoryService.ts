
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
   * Get online vehicles (voorraad status and not in transport)
   */
  async getOnlineVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'voorraad')
        .neq('location', 'onderweg')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch online vehicles from Supabase:', error);
        throw error;
      }

      return data.map(this.mapSupabaseToVehicle);
    } catch (error) {
      console.error('Error fetching online vehicles:', error);
      throw error;
    }
  }

  /**
   * Get B2B sold vehicles
   */
  async getB2BVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'verkocht_b2b')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch B2B vehicles from Supabase:', error);
        throw error;
      }

      return data.map(this.mapSupabaseToVehicle);
    } catch (error) {
      console.error('Error fetching B2B vehicles:', error);
      throw error;
    }
  }

  /**
   * Get B2C sold vehicles
   */
  async getB2CVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'verkocht_b2c')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch B2C vehicles from Supabase:', error);
        throw error;
      }

      return data.map(this.mapSupabaseToVehicle);
    } catch (error) {
      console.error('Error fetching B2C vehicles:', error);
      throw error;
    }
  }

  /**
   * Get delivered vehicles
   */
  async getDeliveredVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'afgeleverd')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch delivered vehicles from Supabase:', error);
        throw error;
      }

      return data.map(this.mapSupabaseToVehicle);
    } catch (error) {
      console.error('Error fetching delivered vehicles:', error);
      throw error;
    }
  }

  /**
   * Get transport vehicles (in transit)
   */
  async getTransportVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('location', 'onderweg')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch transport vehicles from Supabase:', error);
        throw error;
      }

      return data.map(this.mapSupabaseToVehicle);
    } catch (error) {
      console.error('Error fetching transport vehicles:', error);
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
   * Update vehicle location
   */
  async updateVehicleLocation(vehicleId: string, location: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          location,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) {
        console.error('Failed to update vehicle location:', error);
        throw error;
      }

      console.log(`Vehicle ${vehicleId} location updated to ${location}`);
    } catch (error) {
      console.error('Error updating vehicle location:', error);
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
          location: 'showroom',
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
          location: vehicleData.location || 'showroom',
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
      arrived: supabaseVehicle.location !== 'onderweg', // True if not in transport
      papersReceived: false, // Default value
      showroomOnline: supabaseVehicle.status === 'voorraad' && supabaseVehicle.location === 'showroom', // Online if in stock and showroom
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
