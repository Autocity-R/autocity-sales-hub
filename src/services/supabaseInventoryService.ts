import { supabase } from "@/integrations/supabase/client";
import { Vehicle } from "@/types/inventory";
import { loadVehicleRelationships } from "./vehicleRelationshipService";

export class SupabaseInventoryService {
  /**
   * Get all vehicles from Supabase database (excluding delivered vehicles)
   */
  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .not('status', 'in', '(afgeleverd,leenauto)')
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
        .neq('status', 'leenauto')
        .contains('details', { showroomOnline: true })
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
    const incomingDetails = (vehicle.details as any) || {};
    
    // Prepare details object with all extra fields (convert dates to ISO strings)
    // CRITICAL: Use spread to preserve ALL existing details fields (warranty, delivery, etc.)
    const details = {
      ...existingDetails, // Preserve everything first
      ...incomingDetails, // Then merge incoming details (nieuwe/gewijzigde keys hebben voorrang)
      notes: vehicle.notes ?? incomingDetails.notes ?? existingDetails.notes ?? null,
      workshopStatus: vehicle.workshopStatus ?? incomingDetails.workshopStatus ?? existingDetails.workshopStatus ?? 'wachten',
      paintStatus: vehicle.paintStatus ?? incomingDetails.paintStatus ?? existingDetails.paintStatus ?? 'geen_behandeling', 
      transportStatus: vehicle.transportStatus ?? incomingDetails.transportStatus ?? existingDetails.transportStatus ?? 'onderweg',
      bpmRequested: vehicle.bpmRequested ?? incomingDetails.bpmRequested ?? existingDetails.bpmRequested ?? false,
      bpmStarted: vehicle.bpmStarted ?? incomingDetails.bpmStarted ?? existingDetails.bpmStarted ?? false,
      damage: vehicle.damage ?? incomingDetails.damage ?? existingDetails.damage ?? { description: '', status: 'geen' },
      cmrSent: vehicle.cmrSent ?? incomingDetails.cmrSent ?? existingDetails.cmrSent ?? false,
      cmrDate: vehicle.cmrDate ? vehicle.cmrDate.toISOString() : (incomingDetails.cmrDate ?? existingDetails.cmrDate ?? null),
      papersReceived: vehicle.papersReceived ?? incomingDetails.papersReceived ?? existingDetails.papersReceived ?? false,
      papersDate: vehicle.papersDate ? vehicle.papersDate.toISOString() : (incomingDetails.papersDate ?? existingDetails.papersDate ?? null),
      showroomOnline: vehicle.showroomOnline ?? incomingDetails.showroomOnline ?? existingDetails.showroomOnline ?? false,
      paymentStatus: vehicle.paymentStatus ?? incomingDetails.paymentStatus ?? existingDetails.paymentStatus ?? 'niet_betaald',
      // CRITICAL: Always preserve purchase price - use new value if provided, otherwise keep existing
      purchasePrice: vehicle.purchasePrice !== undefined && vehicle.purchasePrice !== null 
        ? vehicle.purchasePrice 
        : (incomingDetails.purchasePrice ?? existingDetails.purchasePrice ?? 0),
      salespersonId: vehicle.salespersonId ?? incomingDetails.salespersonId ?? existingDetails.salespersonId ?? null,
      salespersonName: vehicle.salespersonName ?? incomingDetails.salespersonName ?? existingDetails.salespersonName ?? null,
      mainPhotoUrl: vehicle.mainPhotoUrl ?? incomingDetails.mainPhotoUrl ?? existingDetails.mainPhotoUrl ?? null,
      photos: vehicle.photos ?? incomingDetails.photos ?? existingDetails.photos ?? [],
      // CRITICAL: Preserve trade-in status
      isTradeIn: incomingDetails.isTradeIn ?? existingDetails.isTradeIn ?? false,
      tradeInDate: incomingDetails.tradeInDate ?? existingDetails.tradeInDate ?? null,
      // CRITICAL: Expliciet meenemen van beide betaalstatussen met defaults
      purchase_payment_status: incomingDetails.purchase_payment_status ?? existingDetails.purchase_payment_status ?? 'niet_betaald',
      sales_payment_status: incomingDetails.sales_payment_status ?? existingDetails.sales_payment_status ?? 'niet_betaald',
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

     // CRITICAL: Set sold_date ONLY when status changes to verkocht_b2b or verkocht_b2c
     let soldDate = existingVehicle.sold_date;
     let deliveryDate = existingVehicle.delivery_date;
     
     // Set sold_date when status changes to sold (but NOT afgeleverd)
     if (['verkocht_b2b', 'verkocht_b2c'].includes(salesStatus) && 
         !['verkocht_b2b', 'verkocht_b2c'].includes(existingVehicle.status) && 
         !soldDate) {
       soldDate = new Date().toISOString();
       console.log(`[UPDATE_VEHICLE] Setting sold_date for vehicle ${vehicle.id}`);
     }
     
      // Set delivery_date ONLY when status changes to afgeleverd
      if (salesStatus === 'afgeleverd' && existingVehicle.status !== 'afgeleverd' && !deliveryDate) {
        deliveryDate = new Date().toISOString();
        console.log(`[UPDATE_VEHICLE] Setting delivery_date for vehicle ${vehicle.id}`);
        
        // CRITICAL: Also set salesType when delivering - prevents sales from "disappearing" in weekly leaderboard
        if (!details.salesType) {
          if (existingVehicle.status === 'verkocht_b2b') {
            details.salesType = 'b2b';
          } else if (existingVehicle.status === 'verkocht_b2c') {
            details.salesType = 'b2c';
          } else {
            // Default to B2C if previous status is unclear (e.g., direct from voorraad)
            details.salesType = 'b2c';
          }
          console.log(`[UPDATE_VEHICLE] Setting salesType to ${details.salesType} for vehicle ${vehicle.id}`);
        }
      }

     // Prepare email reminder settings
     const emailReminderSettings = (vehicle as any).emailReminderSettings || {};
     
      // Auto-sync location with transport status
      let locationToSet = existingVehicle.location;
      
      // Als location expliciet wordt meegegeven in de update, gebruik die altijd
      // Anders pas auto-sync toe op basis van transportStatus
      if (vehicle.location !== undefined) {
        // Respecteer ALLE handmatige locatie keuzes (inclusief "afgeleverd")
        locationToSet = vehicle.location;
      } else if (vehicle.transportStatus !== undefined) {
        // Auto-sync alleen als location niet expliciet is opgegeven
        if (vehicle.transportStatus === 'onderweg') {
          locationToSet = 'onderweg';
        } else if (vehicle.transportStatus === 'aangekomen' && existingVehicle.location === 'onderweg') {
          // Alleen auto-sync van onderweg naar showroom
          locationToSet = 'showroom';
        }
      }
     
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
       purchase_price: vehicle.purchasePrice !== undefined && vehicle.purchasePrice !== null
         ? vehicle.purchasePrice
         : existingVehicle.purchase_price,  // ✅ CRITICAL: Preserve purchase_price
       status: salesStatus,
       location: locationToSet,
       import_status: vehicle.importStatus,
       notes: vehicle.notes,
       details: details as any,
       email_reminder_settings: emailReminderSettings as any,
        sold_date: soldDate,
        delivery_date: deliveryDate,
       updated_at: new Date().toISOString(),
      
      // CRITICAL FIX: Write purchaser to separate columns for reports
      purchased_by_user_id: vehicle.purchasedById !== undefined 
        ? vehicle.purchasedById 
        : existingVehicle.purchased_by_user_id,
      purchased_by_name: vehicle.purchasedByName !== undefined
        ? vehicle.purchasedByName
        : existingVehicle.purchased_by_name,
      // CRITICAL FIX: Set purchase_date when purchaser is first assigned
      purchase_date: (() => {
        // If purchasedById is being set and there's no existing purchase_date, set it now
        if (vehicle.purchasedById !== undefined && vehicle.purchasedById && !existingVehicle.purchase_date) {
          return new Date().toISOString();
        }
        // If purchaseDate is explicitly provided, use it
        if (vehicle.purchaseDate !== undefined) {
          return vehicle.purchaseDate ? new Date(vehicle.purchaseDate).toISOString() : null;
        }
        // Otherwise keep existing
        return existingVehicle.purchase_date;
      })(),
        
      // CRITICAL FIX: Write salesperson to sold_by_user_id column for reports
      sold_by_user_id: vehicle.salespersonId !== undefined
        ? vehicle.salespersonId
        : existingVehicle.sold_by_user_id
    };

    // Only update customer_id, supplier_id, and transporter_id if they are explicitly provided (not undefined)
    if (vehicle.customerId !== undefined) {
      updateData.customer_id = vehicle.customerId;
    }
    if (vehicle.supplierId !== undefined) {
      updateData.supplier_id = vehicle.supplierId;
    }
    if (vehicle.transporter_id !== undefined) {
      updateData.transporter_id = vehicle.transporter_id;
    }

    console.log('[UPDATE_VEHICLE] Updating vehicle:', {
      id: vehicle.id,
      customerId: vehicle.customerId,
      supplierId: vehicle.supplierId,
      transporterId: vehicle.transporter_id,
      sellingPrice: updateData.selling_price,
      purchasePrice: details.purchasePrice,
      willUpdateCustomerId: vehicle.customerId !== undefined,
      willUpdateSupplierId: vehicle.supplierId !== undefined,
      willUpdateTransporterId: vehicle.transporter_id !== undefined
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
      // First get current vehicle to check if sold_date is already set and get details
      const { data: currentVehicle } = await supabase
        .from('vehicles')
        .select('sold_date, details')
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

      // Automatically disable showroom online when vehicle is sold
      if (['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(status)) {
        const currentDetails = (currentVehicle?.details || {}) as Record<string, any>;
        if (currentDetails.showroomOnline === true) {
          updateData.details = {
            ...currentDetails,
            showroomOnline: false
          };
          console.log(`Auto-disabling showroomOnline for vehicle ${vehicleId} - status changed to ${status}`);
        }
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
    console.log('Creating vehicle:', vehicleData);
    
     // Prepare details object with defaults (convert dates to ISO strings)
     const details = {
       notes: vehicleData.notes || null,
       workshopStatus: vehicleData.workshopStatus || 'wachten',
       paintStatus: vehicleData.paintStatus || 'geen_behandeling', 
       transportStatus: vehicleData.transportStatus || 'onderweg',
       bpmRequested: vehicleData.bpmRequested || false,
       bpmStarted: vehicleData.bpmStarted || false,
       damage: vehicleData.damage || { description: '', status: 'geen' },
       cmrSent: vehicleData.cmrSent || false,
       cmrDate: vehicleData.cmrDate ? vehicleData.cmrDate.toISOString() : null,
       papersReceived: vehicleData.papersReceived || false,
       papersDate: vehicleData.papersDate ? vehicleData.papersDate.toISOString() : null,
       showroomOnline: vehicleData.showroomOnline || false,
       paymentStatus: vehicleData.paymentStatus || 'niet_betaald',
       salespersonId: vehicleData.salespersonId || null,
       salespersonName: vehicleData.salespersonName || null,
       purchasedById: vehicleData.purchasedById || null,
       purchasedByName: vehicleData.purchasedByName || null,
       mainPhotoUrl: vehicleData.mainPhotoUrl || null,
       photos: vehicleData.photos || [],
       // CRITICAL: Save trade-in status
       isTradeIn: vehicleData.details?.isTradeIn || false,
       tradeInDate: vehicleData.details?.isTradeIn ? new Date().toISOString() : null
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
          purchase_price: vehicleData.purchasePrice || 0,  // ✅ CRITICAL: Save to dedicated column
          status: vehicleData.salesStatus || 'voorraad',
          location: vehicleData.location || 'showroom',
           customer_id: vehicleData.customerId,
           supplier_id: vehicleData.supplierId,
           import_status: vehicleData.importStatus || 'niet_gestart',
          notes: vehicleData.notes,
          details: details as any,
          
          // CRITICAL FIX: Set purchaser on vehicle creation
          purchased_by_user_id: vehicleData.purchasedById || null,
          purchased_by_name: vehicleData.purchasedByName || null,
          purchase_date: vehicleData.purchaseDate ? new Date(vehicleData.purchaseDate).toISOString() : new Date().toISOString(),
          
          // CRITICAL FIX: Set salesperson on vehicle creation
          sold_by_user_id: vehicleData.salespersonId || null
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
      transporter_id: supabaseVehicle.transporter_id,
      customerName: null, // Will be loaded separately when needed
      createdAt: supabaseVehicle.created_at,
      deliveryDate: supabaseVehicle.delivery_date,
      
      // Map import_status and notes from top-level columns
      importStatus: supabaseVehicle.import_status || 'niet_aangemeld',
      transportStatus: details.transportStatus || 'onderweg',
      notes: supabaseVehicle.notes || details.notes || '',
      
      // Map details fields with fallbacks
      // ✅ CRITICAL: Read from purchase_price column first, fallback to details
      purchasePrice: supabaseVehicle.purchase_price || details.purchasePrice || 0,
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
      
      // CRITICAL FIX: Load purchaser from database columns with fallback to details
      purchasedById: supabaseVehicle.purchased_by_user_id || details.purchasedById || null,
      purchasedByName: supabaseVehicle.purchased_by_name || details.purchasedByName || null,
      purchaseDate: supabaseVehicle.purchase_date ? new Date(supabaseVehicle.purchase_date) : null,
      
      // CRITICAL FIX: Load salesperson from sold_by_user_id column
      salespersonId: supabaseVehicle.sold_by_user_id || details.salespersonId || null,
      salespersonName: details.salespersonName || null,
      
      mainPhotoUrl: details.mainPhotoUrl || null,
      photos: details.photos || [],
      
      // CRITICAL: Pass through entire details JSONB object for warranty, delivery, etc.
      details: details,
      
      // Derived fields
      arrived: supabaseVehicle.location !== 'onderweg'
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
