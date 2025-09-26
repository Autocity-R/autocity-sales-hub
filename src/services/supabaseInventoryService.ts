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
   * Update an existing vehicle
   */
  async updateVehicle(vehicle: Vehicle): Promise<Vehicle> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          license_number: vehicle.licenseNumber,
          vin: vehicle.vin,
          mileage: vehicle.mileage,
          selling_price: vehicle.sellingPrice,
          status: vehicle.salesStatus,
          location: vehicle.location,
          customer_id: vehicle.customerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update vehicle:', error);
        throw error;
      }

      return this.mapSupabaseToVehicle(data);
    } catch (error) {
      console.error('Error updating vehicle:', error);
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

  /**
   * Upload file to Supabase Storage with size limits
   */
  async uploadFile(bucketName: string, filePath: string, file: File) {
    try {
      // Check file size (max 25MB)
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (file.size > maxSize) {
        throw new Error(`File te groot. Maximum grootte is 25MB, dit bestand is ${Math.round(file.size / 1024 / 1024)}MB`);
      }

      // Check file type (only allow PDFs, images, and common document types)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Bestandstype niet toegestaan. Alleen PDF, afbeeldingen en documenten zijn toegestaan.`);
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (error) {
        console.error('Failed to upload file to Supabase Storage:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Create vehicle file record in database
   */
  async createVehicleFile(fileData: {
    vehicle_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    category: string;
    uploaded_by?: string;
  }) {
    try {
      // Ensure uploaded_by is set to current user
      let uploadedBy = fileData.uploaded_by;
      if (!uploadedBy) {
        const { data: userData } = await supabase.auth.getUser();
        uploadedBy = userData.user?.id || undefined;
      }
      if (!uploadedBy) {
        throw new Error('Geen ingelogde gebruiker gevonden voor upload');
      }

      const insertData = { ...fileData, uploaded_by: uploadedBy };

      const { data, error } = await supabase
        .from('vehicle_files')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Failed to create vehicle file record:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating vehicle file record:', error);
      throw error;
    }
  }

  /**
   * Get vehicle files from database with signed URLs (with pagination and limits)
   */
  async getVehicleFiles(vehicleId: string, limit: number = 50) {
    console.log('Fetching vehicle files for vehicle:', vehicleId);
    
    try {
      const { data: files, error } = await supabase
        .from('vehicle_files')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching vehicle files:', error);
        throw error;
      }

      if (!files || files.length === 0) {
        console.log('No files found for vehicle:', vehicleId);
        return [];
      }

      // Generate signed URLs for file access and transform to VehicleFile format
      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          try {
            const { data: signedUrl } = await supabase.storage
              .from('vehicle-documents')
              .createSignedUrl(file.file_path, 3600); // 1 hour expiry

            const isLargeFile = file.file_size && file.file_size > 10 * 1024 * 1024; // > 10MB

            return {
              id: file.id,
              vehicleId: file.vehicle_id,
              name: file.file_name,
              url: signedUrl?.signedUrl || '',
              size: file.file_size || 0,
              type: file.file_type || '',
              category: file.category as any,
              uploadedAt: file.created_at,
              uploadedBy: file.uploaded_by,
              isLargeFile: isLargeFile || false,
              filePath: file.file_path,
              createdAt: file.created_at
            };
          } catch (urlError) {
            console.error('Error generating signed URL for file:', file.file_name, urlError);
            return {
              id: file.id,
              vehicleId: file.vehicle_id,
              name: file.file_name,
              url: '',
              size: file.file_size || 0,
              type: file.file_type || '',
              category: file.category as any,
              uploadedAt: file.created_at,
              uploadedBy: file.uploaded_by,
              isLargeFile: file.file_size ? file.file_size > 10 * 1024 * 1024 : false,
              filePath: file.file_path,
              createdAt: file.created_at
            };
          }
        })
      );

      console.log(`Successfully fetched ${filesWithUrls.length} files for vehicle:`, vehicleId);
      return filesWithUrls;
    } catch (error) {
      console.error('Error in getVehicleFiles:', error);
      throw error;
    }
  }

  async deleteVehicleFile(fileId: string, filePath: string): Promise<void> {
    console.log('Deleting vehicle file:', { fileId, filePath });
    
    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('vehicle-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        throw storageError;
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from('vehicle_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('Error deleting file record from database:', dbError);
        throw dbError;
      }

      console.log('Vehicle file deleted successfully');
    } catch (error) {
      console.error('Error in deleteVehicleFile:', error);
      throw error;
    }
  }

}

export const supabaseInventoryService = new SupabaseInventoryService();
