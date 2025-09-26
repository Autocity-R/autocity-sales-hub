
import { Vehicle, PaymentStatus, FileCategory, PaintStatus } from "@/types/inventory";
import { supabaseInventoryService } from "./supabaseInventoryService";
import { supabase } from "@/integrations/supabase/client";

// Mock data and flag for using mock data
let isUseMockData = false;

export const setUseMockData = (useMock: boolean) => {
  isUseMockData = useMock;
};

// Example mock vehicles data (should be replaced with actual mock data)
const mockVehicles: Vehicle[] = [
  // Add mock vehicles here if needed
];

// Update the fetch functions to use Supabase when available
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  try {
    console.log('Fetching all vehicles...');
    
    if (isUseMockData) {
      console.log('Using mock data for vehicles');
      return mockVehicles;
    }

    // Try Supabase first
    try {
      const vehicles = await supabaseInventoryService.getAllVehicles();
      console.log(`Fetched ${vehicles.length} vehicles from Supabase`);
      return vehicles;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockVehicles;
    }
  } catch (error) {
    console.error('Error in fetchVehicles:', error);
    return mockVehicles;
  }
};

export const fetchVehicle = async (vehicleId: string): Promise<Vehicle | null> => {
  try {
    console.log(`Fetching vehicle ${vehicleId}...`);
    
    if (isUseMockData) {
      console.log('Using mock data for vehicle');
      return mockVehicles.find(v => v.id === vehicleId) || null;
    }

    try {
      const vehicles = await supabaseInventoryService.getAllVehicles();
      return vehicles.find(v => v.id === vehicleId) || null;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed:', supabaseError);
      return mockVehicles.find(v => v.id === vehicleId) || null;
    }
  } catch (error) {
    console.error('Error in fetchVehicle:', error);
    return null;
  }
};

export const fetchOnlineVehicles = async (): Promise<Vehicle[]> => {
  try {
    console.log('Fetching online vehicles...');
    
    if (isUseMockData) {
      console.log('Using mock data for online vehicles');
      return mockVehicles.filter(v => v.salesStatus === 'voorraad');
    }

    try {
      const vehicles = await supabaseInventoryService.getOnlineVehicles();
      console.log(`Fetched ${vehicles.length} online vehicles from Supabase`);
      return vehicles;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockVehicles.filter(v => v.salesStatus === 'voorraad');
    }
  } catch (error) {
    console.error('Error in fetchOnlineVehicles:', error);
    return mockVehicles.filter(v => v.salesStatus === 'voorraad');
  }
};

export const fetchB2BVehicles = async (): Promise<Vehicle[]> => {
  try {
    console.log('Fetching B2B vehicles...');
    
    if (isUseMockData) {
      console.log('Using mock data for B2B vehicles');
      return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2b');
    }

    try {
      const vehicles = await supabaseInventoryService.getB2BVehicles();
      console.log(`Fetched ${vehicles.length} B2B vehicles from Supabase`);
      return vehicles;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2b');
    }
  } catch (error) {
    console.error('Error in fetchB2BVehicles:', error);
    return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2b');
  }
};

export const fetchB2CVehicles = async (): Promise<Vehicle[]> => {
  try {
    console.log('Fetching B2C vehicles...');
    
    if (isUseMockData) {
      console.log('Using mock data for B2C vehicles');
      return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2c');
    }

    try {
      const vehicles = await supabaseInventoryService.getB2CVehicles();
      console.log(`Fetched ${vehicles.length} B2C vehicles from Supabase`);
      return vehicles;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2c');
    }
  } catch (error) {
    console.error('Error in fetchB2CVehicles:', error);
    return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2c');
  }
};

export const fetchDeliveredVehicles = async (): Promise<Vehicle[]> => {
  try {
    console.log('Fetching delivered vehicles...');
    
    if (isUseMockData) {
      console.log('Using mock data for delivered vehicles');
      return mockVehicles.filter(v => v.salesStatus === 'afgeleverd');
    }

    try {
      const vehicles = await supabaseInventoryService.getDeliveredVehicles();
      console.log(`Fetched ${vehicles.length} delivered vehicles from Supabase`);
      return vehicles;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockVehicles.filter(v => v.salesStatus === 'afgeleverd');
    }
  } catch (error) {
    console.error('Error in fetchDeliveredVehicles:', error);
    return mockVehicles.filter(v => v.salesStatus === 'afgeleverd');
  }
};

export const fetchTransportVehicles = async (): Promise<Vehicle[]> => {
  try {
    console.log('Fetching transport vehicles...');
    
    if (isUseMockData) {
      console.log('Using mock data for transport vehicles');
      return mockVehicles.filter(v => v.location === 'onderweg');
    }

    try {
      const vehicles = await supabaseInventoryService.getTransportVehicles();
      console.log(`Fetched ${vehicles.length} transport vehicles from Supabase`);
      return vehicles;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockVehicles.filter(v => v.location === 'onderweg');
    }
  } catch (error) {
    console.error('Error in fetchTransportVehicles:', error);
    return mockVehicles.filter(v => v.location === 'onderweg');
  }
};

export const fetchVehicleFiles = async (vehicleId: string): Promise<any[]> => {
  try {
    console.log(`Fetching files for vehicle ${vehicleId}...`);
    
    if (isUseMockData) {
      console.log('Using mock data for vehicle files');
      return [];
    }

    // Fetch files from Supabase
    const files = await supabaseInventoryService.getVehicleFiles(vehicleId);
    console.log(`Fetched ${files.length} files for vehicle ${vehicleId}`);
    return files;
  } catch (error) {
    console.error('Error in fetchVehicleFiles:', error);
    return [];
  }
};

export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  try {
    console.log(`Updating vehicle ${vehicle.id}...`);
    
    if (isUseMockData) {
      console.log('Mock data mode - vehicle update simulated');
      return vehicle;
    }

    try {
      const updatedVehicle = await supabaseInventoryService.updateVehicle(vehicle);
      console.log('Vehicle updated successfully via Supabase');
      return updatedVehicle;
    } catch (supabaseError) {
      console.warn('Supabase update failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in updateVehicle:', error);
    throw error;
  }
};

export const updateVehicleStatus = async (vehicleId: string, status: string): Promise<void> => {
  try {
    console.log(`Updating vehicle ${vehicleId} status to ${status}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - status update simulated');
      return;
    }

    try {
      await supabaseInventoryService.updateVehicleStatus(vehicleId, status);
      console.log('Vehicle status updated successfully via Supabase');
    } catch (supabaseError) {
      console.warn('Supabase update failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in updateVehicleStatus:', error);
    throw error;
  }
};

export const changeVehicleStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad'): Promise<void> => {
  try {
    console.log(`Changing vehicle ${vehicleId} status to ${status}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - status change simulated');
      return;
    }

    try {
      await supabaseInventoryService.updateVehicleStatus(vehicleId, status);
      console.log('Vehicle status changed successfully via Supabase');
    } catch (supabaseError) {
      console.warn('Supabase update failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in changeVehicleStatus:', error);
    throw error;
  }
};

export const markVehicleAsArrived = async (vehicleId: string): Promise<void> => {
  try {
    console.log(`Marking vehicle ${vehicleId} as arrived`);
    
    if (isUseMockData) {
      console.log('Mock data mode - arrival update simulated');
      return;
    }

    try {
      await supabaseInventoryService.markVehicleAsArrived(vehicleId);
      console.log('Vehicle marked as arrived successfully via Supabase');
    } catch (supabaseError) {
      console.warn('Supabase update failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in markVehicleAsArrived:', error);
    throw error;
  }
};

export const markVehicleAsDelivered = async (vehicleId: string): Promise<void> => {
  try {
    console.log(`Marking vehicle ${vehicleId} as delivered`);
    
    if (isUseMockData) {
      console.log('Mock data mode - delivery update simulated');
      return;
    }

    try {
      await supabaseInventoryService.updateVehicleStatus(vehicleId, 'afgeleverd');
      console.log('Vehicle marked as delivered successfully via Supabase');
    } catch (supabaseError) {
      console.warn('Supabase update failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in markVehicleAsDelivered:', error);
    throw error;
  }
};

export const sendEmail = async (type: string, vehicleIds: string[]): Promise<void> => {
  try {
    console.log(`Sending ${type} email for vehicles:`, vehicleIds);
    
    if (isUseMockData) {
      console.log('Mock data mode - email send simulated');
      return;
    }

    // In a real implementation, this would send emails
    console.log('Email send functionality not implemented yet');
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
};

export const updateSellingPrice = async (vehicleId: string, price: number): Promise<void> => {
  try {
    console.log(`Updating selling price for vehicle ${vehicleId} to ${price}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - price update simulated');
      return;
    }

    // In a real implementation, this would update the selling price in Supabase
    console.log('Selling price update functionality not implemented yet');
  } catch (error) {
    console.error('Error in updateSellingPrice:', error);
    throw error;
  }
};

export const updatePaymentStatus = async (vehicleId: string, status: PaymentStatus): Promise<void> => {
  try {
    console.log(`Updating payment status for vehicle ${vehicleId} to ${status}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - payment status update simulated');
      return;
    }

    // In a real implementation, this would update the payment status in Supabase
    console.log('Payment status update functionality not implemented yet');
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error);
    throw error;
  }
};

export const updatePaintStatus = async (vehicleId: string, status: PaintStatus): Promise<void> => {
  try {
    console.log(`Updating paint status for vehicle ${vehicleId} to ${status}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - paint status update simulated');
      return;
    }

    // In a real implementation, this would update the paint status in Supabase
    console.log('Paint status update functionality not implemented yet');
  } catch (error) {
    console.error('Error in updatePaintStatus:', error);
    throw error;
  }
};

export const updateSalesStatus = async (vehicleId: string, status: string): Promise<void> => {
  try {
    console.log(`Updating sales status for vehicle ${vehicleId} to ${status}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - sales status update simulated');
      return;
    }

    try {
      await supabaseInventoryService.updateVehicleStatus(vehicleId, status);
      console.log('Sales status updated successfully via Supabase');
    } catch (supabaseError) {
      console.warn('Supabase update failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in updateSalesStatus:', error);
    throw error;
  }
};

export const uploadVehiclePhoto = async (vehicleId: string, file: File, isMain: boolean): Promise<string> => {
  try {
    console.log(`Uploading photo for vehicle ${vehicleId}, isMain: ${isMain}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - photo upload simulated');
      return `mock-photo-url-${Date.now()}`;
    }

    // In a real implementation, this would upload to Supabase Storage
    console.log('Photo upload functionality not implemented yet');
    return `mock-photo-url-${Date.now()}`;
  } catch (error) {
    console.error('Error in uploadVehiclePhoto:', error);
    throw error;
  }
};

export const uploadVehicleFile = async (file: File, category: FileCategory, vehicleId: string): Promise<any> => {
  try {
    console.log(`Uploading file for vehicle ${vehicleId}, category: ${category}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - file upload simulated');
      return { id: `mock-file-${Date.now()}`, name: file.name, category };
    }

    // Use Supabase Storage and database
    const fileExtension = file.name.split('.').pop();
    const fileName = `${vehicleId}/${category}/${Date.now()}-${file.name}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vehicle-documents')
      .upload(fileName, file);
    
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Save metadata to database
    const fileRecord = await supabaseInventoryService.createVehicleFile({
      vehicle_id: vehicleId,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      file_type: file.type,
      category: category
    });
    
    console.log('File uploaded successfully:', fileRecord);
    return fileRecord;
  } catch (error) {
    console.error('Error in uploadVehicleFile:', error);
    throw error;
  }
};

export const bulkUpdateVehicles = async (vehicles: Vehicle[]): Promise<void> => {
  try {
    console.log(`Bulk updating ${vehicles.length} vehicles...`);
    
    if (isUseMockData) {
      console.log('Mock data mode - bulk update simulated');
      return;
    }

    // In a real implementation, this would bulk update vehicles in Supabase
    console.log('Bulk update functionality not implemented yet');
  } catch (error) {
    console.error('Error in bulkUpdateVehicles:', error);
    throw error;
  }
};

export const createVehicle = async (vehicleData: Omit<Vehicle, "id">): Promise<Vehicle> => {
  try {
    console.log('Creating new vehicle...', vehicleData);
    
    if (isUseMockData) {
      console.log('Mock data mode - vehicle creation simulated');
      const newVehicle: Vehicle = {
        ...vehicleData,
        id: `vehicle-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      mockVehicles.push(newVehicle);
      return newVehicle;
    }

    try {
      const newVehicle = await supabaseInventoryService.createVehicle(vehicleData);
      console.log('Vehicle created successfully via Supabase');
      return newVehicle;
    } catch (supabaseError) {
      console.warn('Supabase creation failed:', supabaseError);
      throw supabaseError;
    }
  } catch (error) {
    console.error('Error in createVehicle:', error);
    throw error;
  }
};

export const getVehicleStats = async (): Promise<any> => {
  try {
    console.log('Fetching vehicle statistics...');
    
    if (isUseMockData) {
      console.log('Using mock data for vehicle stats');
      return {
        total: mockVehicles.length,
        voorraad: mockVehicles.filter(v => v.salesStatus === 'voorraad').length,
        verkocht_b2c: mockVehicles.filter(v => v.salesStatus === 'verkocht_b2c').length,
        verkocht_b2b: mockVehicles.filter(v => v.salesStatus === 'verkocht_b2b').length,
        afgeleverd: mockVehicles.filter(v => v.salesStatus === 'afgeleverd').length,
      };
    }

    try {
      const vehicles = await supabaseInventoryService.getAllVehicles();
      return {
        total: vehicles.length,
        voorraad: vehicles.filter(v => v.salesStatus === 'voorraad').length,
        verkocht_b2c: vehicles.filter(v => v.salesStatus === 'verkocht_b2c').length,
        verkocht_b2b: vehicles.filter(v => v.salesStatus === 'verkocht_b2b').length,
        afgeleverd: vehicles.filter(v => v.salesStatus === 'afgeleverd').length,
      };
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, using mock stats:', supabaseError);
      return {
        total: 0,
        voorraad: 0,
        verkocht_b2c: 0,
        verkocht_b2b: 0,
        afgeleverd: 0,
      };
    }
  } catch (error) {
    console.error('Error in getVehicleStats:', error);
    return {
      total: 0,
      voorraad: 0,
      verkocht_b2c: 0,
      verkocht_b2b: 0,
      afgeleverd: 0,
    };
  }
};
