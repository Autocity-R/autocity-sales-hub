import { Vehicle, PaymentStatus, FileCategory } from "@/types/inventory";
import { supabaseInventoryService } from "./supabaseInventoryService";

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

export const fetchOnlineVehicles = async (): Promise<Vehicle[]> => {
  try {
    console.log('Fetching online vehicles...');
    
    if (isUseMockData) {
      console.log('Using mock data for online vehicles');
      return mockVehicles.filter(v => v.showroomOnline);
    }

    // Try Supabase first
    try {
      const vehicles = await supabaseInventoryService.getOnlineVehicles();
      console.log(`Fetched ${vehicles.length} online vehicles from Supabase`);
      return vehicles;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockVehicles.filter(v => v.showroomOnline);
    }
  } catch (error) {
    console.error('Error in fetchOnlineVehicles:', error);
    return mockVehicles.filter(v => v.showroomOnline);
  }
};

export const fetchB2BVehicles = async (): Promise<Vehicle[]> => {
  try {
    console.log('Fetching B2B vehicles...');
    
    if (isUseMockData) {
      console.log('Using mock data for B2B vehicles');
      return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2b');
    }

    // Try Supabase first
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

    // Try Supabase first
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

    // Try Supabase first
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
      return mockVehicles.filter(v => !v.arrived);
    }

    // Try Supabase first
    try {
      const vehicles = await supabaseInventoryService.getTransportVehicles();
      console.log(`Fetched ${vehicles.length} transport vehicles from Supabase`);
      return vehicles;
    } catch (supabaseError) {
      console.warn('Supabase fetch failed, falling back to mock data:', supabaseError);
      return mockVehicles.filter(v => !v.arrived);
    }
  } catch (error) {
    console.error('Error in fetchTransportVehicles:', error);
    return mockVehicles.filter(v => !v.arrived);
  }
};

export const updateVehicleStatus = async (vehicleId: string, status: string): Promise<void> => {
  try {
    console.log(`Updating vehicle ${vehicleId} status to ${status}`);
    
    if (isUseMockData) {
      console.log('Mock data mode - status update simulated');
      return;
    }

    // Try Supabase first
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

export const markVehicleAsArrived = async (vehicleId: string): Promise<void> => {
  try {
    console.log(`Marking vehicle ${vehicleId} as arrived`);
    
    if (isUseMockData) {
      console.log('Mock data mode - arrival update simulated');
      return;
    }

    // Try Supabase first
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
