import { supabase } from "@/integrations/supabase/client";
import { Vehicle } from "@/types/inventory";
import { loadVehicleRelationships } from "./vehicleRelationshipService";

export class SupabaseInventoryService {
  /**
   * Get all vehicles from Supabase database (excluding delivered vehicles AND transport vehicles)
   * CRITICAL: Voorraad menu mag ALLEEN voertuigen tonen die binnen zijn (transportStatus != 'onderweg')
   */
  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .neq('status', 'afgeleverd')
        // KRITIEK: Exclude voertuigen die onderweg zijn om overlap met Transport menu te voorkomen
        .or('details->>transportStatus.is.null,details->>transportStatus.neq.onderweg')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch vehicles from Supabase:', error);
        throw error;
      }

      console.log(`[INVENTORY] ✅ Fetched ${data.length} voorraad vehicles (excluding onderweg)`);

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
   * Get online vehicles (voorraad status, location is showroom, and transport is arrived)
   */
  async getOnlineVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'voorraad')
        .eq('location', 'showroom')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch online vehicles from Supabase:', error);
        throw error;
      }

      // Filter vehicles that are online and not in transport
      const vehicles = data
        .map(this.mapSupabaseToVehicle)
        .filter(v => {
          const isNotInTransport = v.transportStatus !== 'onderweg';
          const isShowroomOnline = v.showroomOnline === true;
          return isNotInTransport && isShowroomOnline;
        });

      return vehicles;
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

      const vehicles = data.map(this.mapSupabaseToVehicle);
      const vehiclesWithNames = await loadVehicleRelationships(vehicles);
      return vehiclesWithNames;
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

      const vehicles = data.map(this.mapSupabaseToVehicle);
      const vehiclesWithNames = await loadVehicleRelationships(vehicles);
      return vehiclesWithNames;
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

      const vehicles = data.map(this.mapSupabaseToVehicle);
      const vehiclesWithNames = await loadVehicleRelationships(vehicles);
      return vehiclesWithNames;
    } catch (error) {
      console.error('Error fetching delivered vehicles:', error);
      throw error;
    }
  }

   /**
    * Get transport vehicles (vehicles with transport status "onderweg")
    */
   async getTransportVehicles(): Promise<Vehicle[]> {
     try {
       const { data, error } = await supabase
         .from('vehicles')
         .select('*')
         .contains('details', { transportStatus: 'onderweg' })
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
    console.log('Updating vehicle:', vehicle.id);
    
    // CRITICAL: First fetch the existing vehicle to preserve data
    const { data: existingVehicle, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicle.id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch existing vehicle:', fetchError);
      throw fetchError;
    }

    // Preserve existing data from details
    const existingDetails = (existingVehicle.details as any) || {};
    
    // Determine transport status
    const transportStatus = vehicle.transportStatus || existingDetails.transportStatus || 'aangekomen';
    const isInTransit = transportStatus === 'onderweg';
    
    // Force location and showroomOnline if in transit
    const finalLocation = isInTransit ? 'onderweg' : vehicle.location;
    const finalShowroomOnline = isInTransit ? false : (vehicle.showroomOnline ?? existingDetails.showroomOnline ?? false);
    
    // Auto-set status to voorraad when arrived and not sold/delivered
    let finalStatus = vehicle.salesStatus;
    if (transportStatus === 'aangekomen' && !['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(vehicle.salesStatus)) {
      finalStatus = 'voorraad';
    }
    
    // Prepare details object with all extra fields (convert dates to ISO strings)
    // CRITICAL: Preserve existing purchasePrice if not provided in update
    const details = {
      notes: vehicle.notes || existingDetails.notes || null,
      workshopStatus: vehicle.workshopStatus || existingDetails.workshopStatus || 'wachten',
      paintStatus: vehicle.paintStatus || existingDetails.paintStatus || 'geen_behandeling', 
      transportStatus,
      bpmRequested: vehicle.bpmRequested ?? existingDetails.bpmRequested ?? false,
      bpmStarted: vehicle.bpmStarted ?? existingDetails.bpmStarted ?? false,
      damage: vehicle.damage || existingDetails.damage || { description: '', status: 'geen' },
      cmrSent: vehicle.cmrSent ?? existingDetails.cmrSent ?? false,
      cmrDate: vehicle.cmrDate ? vehicle.cmrDate.toISOString() : (existingDetails.cmrDate || null),
      papersReceived: vehicle.papersReceived ?? existingDetails.papersReceived ?? false,
      papersDate: vehicle.papersDate ? vehicle.papersDate.toISOString() : (existingDetails.papersDate || null),
      showroomOnline: finalShowroomOnline,
      paymentStatus: vehicle.paymentStatus || existingDetails.paymentStatus || 'niet_betaald',
      // CRITICAL: Always preserve purchase price - use new value if provided, otherwise keep existing
      purchasePrice: vehicle.purchasePrice !== undefined && vehicle.purchasePrice !== null 
        ? vehicle.purchasePrice 
        : (existingDetails.purchasePrice || 0),
      salespersonId: vehicle.salespersonId || existingDetails.salespersonId || null,
      salespersonName: vehicle.salespersonName || existingDetails.salespersonName || null,
      mainPhotoUrl: vehicle.mainPhotoUrl || existingDetails.mainPhotoUrl || null,
      photos: vehicle.photos || existingDetails.photos || []
    };

     // CRITICAL: Protect sold status from being accidentally changed
     // Only allow status changes if explicitly requested
     let salesStatus = vehicle.salesStatus;
     
     // If current vehicle is sold (B2B, B2C, or delivered), do NOT change status
     // unless the new status is also a sold status
     if (['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(existingVehicle.status)) {
       // Only allow changing between sold statuses, not back to voorraad
       if (!['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(vehicle.salesStatus)) {
         console.warn(`[UPDATE_VEHICLE] Preventing status change from ${existingVehicle.status} to ${vehicle.salesStatus}`);
         salesStatus = existingVehicle.status as any;
       }
     }
     
     // Auto-update sales status when transport status changes to "aangekomen"
     // BUT ONLY if the vehicle is not already sold (preserve sold status)
     if (vehicle.transportStatus === 'aangekomen' && 
         !['voorraad', 'verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(salesStatus)) {
       salesStatus = 'voorraad';
     }

     // Determine if we need to set sold_date
     let soldDate = existingVehicle.sold_date;
     // If status is changing to a sold status and there's no sold_date yet, set it
     if (['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(salesStatus) && !soldDate) {
       soldDate = new Date().toISOString();
       console.log(`[UPDATE_VEHICLE] Setting sold_date for vehicle ${vehicle.id}`);
     }

    // Prepare email reminder settings
    const emailReminderSettings = (vehicle as any).emailReminderSettings || {};
    
    // Prepare update data
    // CRITICAL: Preserve selling_price - use new value if provided, otherwise keep existing
    const updateData: any = {
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      license_number: vehicle.licenseNumber,
      vin: vehicle.vin,
      mileage: vehicle.mileage,
      selling_price: vehicle.sellingPrice !== undefined && vehicle.sellingPrice !== null
        ? vehicle.sellingPrice
        : existingVehicle.selling_price,
      status: finalStatus,
      location: finalLocation,
      import_status: vehicle.importStatus,
      notes: vehicle.notes,
      details: details as any,
      email_reminder_settings: emailReminderSettings as any,
      sold_date: soldDate,
      updated_at: new Date().toISOString()
    };

    // Only update customer_id and supplier_id if they are explicitly provided (not undefined)
    if (vehicle.customerId !== undefined) {
      updateData.customer_id = vehicle.customerId;
    }
    if (vehicle.supplierId !== undefined) {
      updateData.supplier_id = vehicle.supplierId;
    }

    console.log('[UPDATE_VEHICLE] Updating vehicle:', {
      id: vehicle.id,
      customerId: vehicle.customerId,
      supplierId: vehicle.supplierId,
      sellingPrice: updateData.selling_price,
      purchasePrice: details.purchasePrice,
      willUpdateCustomerId: vehicle.customerId !== undefined,
      willUpdateSupplierId: vehicle.supplierId !== undefined
    });
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicle.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update vehicle:', error);
        throw error;
      }

      console.log('Vehicle updated successfully:', data);
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
      // First get current vehicle to check if sold_date is already set
      const { data: currentVehicle } = await supabase
        .from('vehicles')
        .select('sold_date')
        .eq('id', vehicleId)
        .single();

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Automatically set sold_date when status changes to sold status
      // Only if sold_date is not already set
      if (['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(status) && !currentVehicle?.sold_date) {
        updateData.sold_date = new Date().toISOString();
        console.log(`Setting sold_date for vehicle ${vehicleId} to ${updateData.sold_date}`);
      }

      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
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
   * Mark vehicle as arrived - sets location to showroom, status to voorraad, and updates transport status
   */
  async markVehicleAsArrived(vehicleId: string): Promise<void> {
    try {
      // First fetch current vehicle to get existing details and status
      const { data: existingVehicle, error: fetchError } = await supabase
        .from('vehicles')
        .select('details, status')
        .eq('id', vehicleId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch vehicle for arrival update:', fetchError);
        throw fetchError;
      }

      const existingDetails = (existingVehicle?.details as any) || {};
      const currentStatus = existingVehicle?.status || 'voorraad';
      
      // Only set to voorraad if not already sold or delivered
      const finalStatus = ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(currentStatus) 
        ? currentStatus 
        : 'voorraad';
      
      // Update details with arrived transport status
      const updatedDetails = {
        ...existingDetails,
        transportStatus: 'aangekomen'
      };

      const { error } = await supabase
        .from('vehicles')
        .update({ 
          location: 'showroom',
          status: finalStatus,
          details: updatedDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) {
        console.error('Failed to mark vehicle as arrived:', error);
        throw error;
      }

      console.log(`Vehicle ${vehicleId} marked as arrived, status: ${finalStatus}, location: showroom`);
    } catch (error) {
      console.error('Error marking vehicle as arrived:', error);
      throw error;
    }
  }

  /**
   * Create a new vehicle
   */
  async createVehicle(vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    console.log('Creating vehicle:', vehicleData);
    
    // Determine transport status - default to 'onderweg' if not specified
    const transportStatus = vehicleData.transportStatus || 'onderweg';
    const isUnderweg = transportStatus === 'onderweg';
    
    // CRITICAL: If vehicle is onderweg, force location='onderweg' and showroomOnline=false
    // Status should always be a valid sales status (voorraad, verkocht_b2b, verkocht_b2c, afgeleverd)
    // NOT 'in_transit' - transport status is tracked via location and details.transportStatus
    const defaultStatus = vehicleData.salesStatus || 'voorraad';
    const defaultLocation = isUnderweg ? 'onderweg' : (vehicleData.location || 'showroom');
    
     // Prepare details object with defaults (convert dates to ISO strings)
     // CRITICAL: Store purchasePrice in details.purchasePrice
     const details = {
       purchasePrice: vehicleData.purchasePrice || 0,
       notes: vehicleData.notes || null,
       workshopStatus: vehicleData.workshopStatus || 'wachten',
       paintStatus: vehicleData.paintStatus || 'geen_behandeling', 
       transportStatus: transportStatus,
       bpmRequested: vehicleData.bpmRequested || false,
       bpmStarted: vehicleData.bpmStarted || false,
       damage: vehicleData.damage || { description: '', status: 'geen' },
       cmrSent: vehicleData.cmrSent || false,
       cmrDate: vehicleData.cmrDate ? vehicleData.cmrDate.toISOString() : null,
       papersReceived: vehicleData.papersReceived || false,
       papersDate: vehicleData.papersDate ? vehicleData.papersDate.toISOString() : null,
       showroomOnline: isUnderweg ? false : (vehicleData.showroomOnline || false),
       paymentStatus: vehicleData.paymentStatus || 'niet_betaald',
       salespersonId: vehicleData.salespersonId || null,
       salespersonName: vehicleData.salespersonName || null,
       mainPhotoUrl: vehicleData.mainPhotoUrl || null,
       photos: vehicleData.photos || []
     };
    
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          brand: vehicleData.brand || '',
          model: vehicleData.model || '',
          year: vehicleData.year,
          color: vehicleData.color,
          license_number: vehicleData.licenseNumber,
          vin: vehicleData.vin,
          mileage: vehicleData.mileage,
          selling_price: vehicleData.sellingPrice,
          status: defaultStatus,
          location: defaultLocation,
           customer_id: vehicleData.customerId,
           supplier_id: vehicleData.supplierId,
           import_status: vehicleData.importStatus || 'niet_gestart',
          notes: vehicleData.notes,
          details: details as any
        }])
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
    // Extract details with fallbacks
    const details = supabaseVehicle.details || {};
    
    return {
      id: supabaseVehicle.id,
      brand: supabaseVehicle.brand,
      model: supabaseVehicle.model,
      year: supabaseVehicle.year,
      color: supabaseVehicle.color,
      licenseNumber: supabaseVehicle.license_number,
      vin: supabaseVehicle.vin,
      mileage: supabaseVehicle.mileage,
      sellingPrice: supabaseVehicle.selling_price,
      location: supabaseVehicle.location || 'showroom',
      salesStatus: supabaseVehicle.status as any,
      customerId: supabaseVehicle.customer_id,
      supplierId: supabaseVehicle.supplier_id,
      customerName: null, // Will be loaded separately when needed
      createdAt: supabaseVehicle.created_at,
      
      // Map import_status and notes from top-level columns
      importStatus: supabaseVehicle.import_status || 'niet_aangemeld',
      transportStatus: details.transportStatus || 'onderweg',
      notes: supabaseVehicle.notes || details.notes || '',
      
      // Map details fields with fallbacks
      purchasePrice: details.purchasePrice || 0,
      workshopStatus: details.workshopStatus || 'wachten',
      paintStatus: details.paintStatus || 'geen_behandeling',
      damage: details.damage || { description: '', status: 'geen' },
      bpmRequested: details.bpmRequested || false,
      bpmStarted: details.bpmStarted || false,
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
      
      // Derived fields - arrived based on transportStatus, not location
      arrived: details.transportStatus === 'aangekomen'
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

  /**
   * Delete a vehicle by ID
   */
  async deleteVehicle(vehicleId: string): Promise<void> {
    console.log('Deleting vehicle:', vehicleId);
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) {
        console.error('Error deleting vehicle from Supabase:', error);
        throw error;
      }

      console.log('Vehicle deleted successfully');
    } catch (error) {
      console.error('Error in deleteVehicle:', error);
      throw error;
    }
  }

}

export const supabaseInventoryService = new SupabaseInventoryService();
