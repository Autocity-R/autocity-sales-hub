
import { Vehicle } from "@/types/inventory";
import { supabaseInventoryService } from "./supabaseInventoryService";

// Mock data as fallback
const mockVehicles: Vehicle[] = [
  {
    id: "1",
    brand: "BMW",
    model: "X5",
    year: 2023,
    color: "Zwart",
    licenseNumber: "1-ABC-123",
    vin: "WBAXXX123456789",
    mileage: 15000,
    purchasePrice: 45000,
    sellingPrice: 52000,
    location: "showroom",
    salesStatus: "voorraad",
    importStatus: "ingeschreven",
    arrived: true,
    papersReceived: true,
    showroomOnline: true,
    mainPhotoUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=300&h=200&fit=crop",
    photos: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=300&h=200&fit=crop"],
    workshopStatus: "gereed",
    damage: { description: "", status: "geen" },
    bpmRequested: false,
    bpmStarted: false,
    cmrSent: false,
    cmrDate: null,
    papersDate: null,
    notes: "",
    paymentStatus: "volledig_betaald",
    createdAt: new Date("2024-01-15").toISOString()
  },
  {
    id: "2",
    brand: "Mercedes",
    model: "E-Class",
    year: 2022,
    color: "Zilver",
    licenseNumber: "2-DEF-456",
    vin: "WDB2XXX987654321",
    mileage: 22000,
    purchasePrice: 38000,
    sellingPrice: 44000,
    location: "onderweg",
    salesStatus: "verkocht_b2c",
    importStatus: "onderweg",
    arrived: false,
    papersReceived: false,
    showroomOnline: false,
    mainPhotoUrl: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=300&h=200&fit=crop",
    photos: ["https://images.unsplash.com/photo-1563720223185-11003d516935?w=300&h=200&fit=crop"],
    workshopStatus: "wachten",
    damage: { description: "", status: "geen" },
    bpmRequested: false,
    bpmStarted: false,
    cmrSent: false,
    cmrDate: null,
    papersDate: null,
    notes: "",
    paymentStatus: "niet_betaald",
    createdAt: new Date("2024-01-10").toISOString()
  },
  {
    id: "3",
    brand: "Audi",
    model: "A4",
    year: 2023,
    color: "Wit",
    licenseNumber: "3-GHI-789",
    vin: "WAUZZZ456789123",
    mileage: 8500,
    purchasePrice: 35000,
    sellingPrice: 41000,
    location: "showroom",
    salesStatus: "verkocht_b2b",
    importStatus: "aangekomen",
    arrived: true,
    papersReceived: true,
    showroomOnline: true,
    mainPhotoUrl: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=300&h=200&fit=crop",
    photos: ["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=300&h=200&fit=crop"],
    workshopStatus: "gereed",
    damage: { description: "", status: "geen" },
    bpmRequested: false,
    bpmStarted: false,
    cmrSent: false,
    cmrDate: null,
    papersDate: null,
    notes: "",
    paymentStatus: "volledig_betaald",
    createdAt: new Date("2024-01-08").toISOString()
  }
];

let useMockData = false;

/**
 * Enable or disable mock data usage
 */
export const setUseMockData = (enabled: boolean) => {
  useMockData = enabled;
  console.log(`Inventory service: Mock data ${enabled ? 'enabled' : 'disabled'}`);
};

/**
 * Get all vehicles with smart fallback
 */
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  if (useMockData) {
    console.log('Using mock vehicle data');
    return mockVehicles;
  }

  try {
    console.log('Fetching vehicles from Supabase...');
    const vehicles = await supabaseInventoryService.getAllVehicles();
    console.log(`✅ Fetched ${vehicles.length} vehicles from Supabase`);
    return vehicles;
  } catch (error) {
    console.error('Failed to fetch vehicles from Supabase, falling back to mock data:', error);
    return mockVehicles;
  }
};

/**
 * Get single vehicle by ID
 */
export const fetchVehicle = async (id: string): Promise<Vehicle | null> => {
  const vehicles = await fetchVehicles();
  return vehicles.find(v => v.id === id) || null;
};

/**
 * Get B2C vehicles (sold to consumers)
 */
export const fetchB2CVehicles = async (): Promise<Vehicle[]> => {
  if (useMockData) {
    console.log('Using mock B2C vehicle data');
    return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2c');
  }

  try {
    console.log('Fetching B2C vehicles from Supabase...');
    const vehicles = await supabaseInventoryService.getVehiclesByStatus('verkocht_b2c');
    console.log(`✅ Fetched ${vehicles.length} B2C vehicles from Supabase`);
    return vehicles;
  } catch (error) {
    console.error('Failed to fetch B2C vehicles from Supabase, falling back to mock data:', error);
    return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2c');
  }
};

/**
 * Get B2B vehicles (sold to businesses)
 */
export const fetchB2BVehicles = async (): Promise<Vehicle[]> => {
  if (useMockData) {
    console.log('Using mock B2B vehicle data');
    return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2b');
  }

  try {
    console.log('Fetching B2B vehicles from Supabase...');
    const vehicles = await supabaseInventoryService.getVehiclesByStatus('verkocht_b2b');
    console.log(`✅ Fetched ${vehicles.length} B2B vehicles from Supabase`);
    return vehicles;
  } catch (error) {
    console.error('Failed to fetch B2B vehicles from Supabase, falling back to mock data:', error);
    return mockVehicles.filter(v => v.salesStatus === 'verkocht_b2b');
  }
};

/**
 * Get delivered vehicles
 */
export const fetchDeliveredVehicles = async (): Promise<Vehicle[]> => {
  const vehicles = await fetchVehicles();
  return vehicles.filter(v => v.salesStatus === 'afgeleverd');
};

/**
 * Get online vehicles (available in showroom)
 */
export const fetchOnlineVehicles = async (): Promise<Vehicle[]> => {
  const vehicles = await fetchVehicles();
  return vehicles.filter(v => v.showroomOnline);
};

/**
 * Update vehicle sales status
 */
export const updateVehicleStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad'): Promise<void> => {
  if (useMockData) {
    console.log(`Mock: Updating vehicle ${vehicleId} status to ${status}`);
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.salesStatus = status;
    }
    return;
  }

  try {
    await supabaseInventoryService.updateVehicleStatus(vehicleId, status);
  } catch (error) {
    console.error('Failed to update vehicle status:', error);
    throw error;
  }
};

/**
 * Update vehicle
 */
export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  if (useMockData) {
    console.log(`Mock: Updating vehicle ${vehicle.id}`);
    const index = mockVehicles.findIndex(v => v.id === vehicle.id);
    if (index >= 0) {
      mockVehicles[index] = vehicle;
      return mockVehicles[index];
    }
    return vehicle;
  }

  // For real implementation, you would update via Supabase
  console.log('Update vehicle via Supabase - not implemented yet');
  return vehicle;
};

/**
 * Bulk update vehicles
 */
export const bulkUpdateVehicles = async (vehicles: Vehicle[]): Promise<void> => {
  if (useMockData) {
    console.log(`Mock: Bulk updating ${vehicles.length} vehicles`);
    vehicles.forEach(vehicle => {
      const index = mockVehicles.findIndex(v => v.id === vehicle.id);
      if (index >= 0) {
        mockVehicles[index] = vehicle;
      }
    });
    return;
  }

  console.log('Bulk update vehicles via Supabase - not implemented yet');
};

/**
 * Mark vehicle as arrived
 */
export const markVehicleAsArrived = async (vehicleId: string): Promise<void> => {
  if (useMockData) {
    console.log(`Mock: Marking vehicle ${vehicleId} as arrived`);
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.arrived = true;
    }
    return;
  }

  try {
    await supabaseInventoryService.markVehicleAsArrived(vehicleId);
  } catch (error) {
    console.error('Failed to mark vehicle as arrived:', error);
    throw error;
  }
};

/**
 * Mark vehicle as delivered
 */
export const markVehicleAsDelivered = async (vehicleId: string): Promise<void> => {
  if (useMockData) {
    console.log(`Mock: Marking vehicle ${vehicleId} as delivered`);
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.salesStatus = 'afgeleverd';
      vehicle.deliveryDate = new Date();
    }
    return;
  }

  console.log('Mark vehicle as delivered via Supabase - not implemented yet');
};

/**
 * Create a new vehicle
 */
export const createVehicle = async (vehicleData: Partial<Vehicle>): Promise<Vehicle> => {
  if (useMockData) {
    console.log('Mock: Creating new vehicle');
    const newVehicle: Vehicle = {
      id: String(mockVehicles.length + 1),
      brand: vehicleData.brand || '',
      model: vehicleData.model || '',
      year: vehicleData.year || new Date().getFullYear(),
      color: vehicleData.color || '',
      licenseNumber: vehicleData.licenseNumber || '',
      vin: vehicleData.vin || '',
      mileage: vehicleData.mileage || 0,
      purchasePrice: vehicleData.purchasePrice || 0,
      sellingPrice: vehicleData.sellingPrice || 0,
      location: vehicleData.location || 'showroom',
      salesStatus: vehicleData.salesStatus || 'voorraad',
      importStatus: 'niet_gestart',
      arrived: false,
      papersReceived: false,
      showroomOnline: false,
      workshopStatus: 'wachten',
      damage: { description: '', status: 'geen' },
      bpmRequested: false,
      bpmStarted: false,
      cmrSent: false,
      cmrDate: null,
      papersDate: null,
      notes: '',
      paymentStatus: 'niet_betaald',
      mainPhotoUrl: null,
      photos: [],
      createdAt: new Date().toISOString()
    };
    mockVehicles.push(newVehicle);
    return newVehicle;
  }

  try {
    return await supabaseInventoryService.createVehicle(vehicleData);
  } catch (error) {
    console.error('Failed to create vehicle:', error);
    throw error;
  }
};

/**
 * Send email
 */
export const sendEmail = async (type: string, vehicleIds: string[]): Promise<void> => {
  console.log(`Mock: Sending ${type} email for vehicles:`, vehicleIds);
  // In a real implementation, this would send emails via an email service
};

/**
 * Update selling price
 */
export const updateSellingPrice = async (vehicleId: string, price: number): Promise<void> => {
  if (useMockData) {
    console.log(`Mock: Updating selling price for vehicle ${vehicleId} to ${price}`);
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.sellingPrice = price;
    }
    return;
  }

  console.log('Update selling price via Supabase - not implemented yet');
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (vehicleId: string, status: any): Promise<void> => {
  if (useMockData) {
    console.log(`Mock: Updating payment status for vehicle ${vehicleId} to ${status}`);
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.paymentStatus = status;
    }
    return;
  }

  console.log('Update payment status via Supabase - not implemented yet');
};

/**
 * Update paint status
 */
export const updatePaintStatus = async (vehicleId: string, status: any): Promise<void> => {
  if (useMockData) {
    console.log(`Mock: Updating paint status for vehicle ${vehicleId} to ${status}`);
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.paintStatus = status;
    }
    return;
  }

  console.log('Update paint status via Supabase - not implemented yet');
};

/**
 * Update sales status
 */
export const updateSalesStatus = async (vehicleId: string, status: any): Promise<void> => {
  if (useMockData) {
    console.log(`Mock: Updating sales status for vehicle ${vehicleId} to ${status}`);
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.salesStatus = status;
    }
    return;
  }

  console.log('Update sales status via Supabase - not implemented yet');
};

/**
 * Change vehicle status (alias for updateVehicleStatus)
 */
export const changeVehicleStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad'): Promise<void> => {
  return updateVehicleStatus(vehicleId, status);
};

/**
 * Upload vehicle photo
 */
export const uploadVehiclePhoto = async (vehicleId: string, file: File, isMain: boolean = false): Promise<string> => {
  console.log(`Mock: Uploading photo for vehicle ${vehicleId}, isMain: ${isMain}`);
  // In a real implementation, this would upload to Supabase Storage
  const mockUrl = "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=300&h=200&fit=crop";
  
  if (useMockData) {
    const vehicle = mockVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      if (!vehicle.photos.includes(mockUrl)) {
        vehicle.photos.push(mockUrl);
      }
      if (isMain) {
        vehicle.mainPhotoUrl = mockUrl;
      }
    }
  }
  
  return mockUrl;
};

/**
 * Upload vehicle file
 */
export const uploadVehicleFile = async (file: File, category: any, vehicleId: string): Promise<any> => {
  console.log(`Mock: Uploading file for vehicle ${vehicleId}, category: ${category}`);
  // In a real implementation, this would upload to Supabase Storage
  return {
    id: `file-${Date.now()}`,
    name: file.name,
    url: "https://example.com/mock-file.pdf",
    category,
    vehicleId,
    createdAt: new Date().toISOString(),
    size: file.size,
    type: file.type
  };
};

/**
 * Fetch vehicle files
 */
export const fetchVehicleFiles = async (vehicleId: string): Promise<any[]> => {
  console.log(`Mock: Fetching files for vehicle ${vehicleId}`);
  // In a real implementation, this would fetch from Supabase
  return [];
};

/**
 * Get vehicle statistics
 */
export const getVehicleStats = async () => {
  try {
    const vehicles = await fetchVehicles();
    
    return {
      total: vehicles.length,
      voorraad: vehicles.filter(v => v.salesStatus === 'voorraad').length,
      verkocht_b2c: vehicles.filter(v => v.salesStatus === 'verkocht_b2c').length,
      verkocht_b2b: vehicles.filter(v => v.salesStatus === 'verkocht_b2b').length,
      arrived: vehicles.filter(v => v.arrived).length,
      papersReceived: vehicles.filter(v => v.papersReceived).length,
      online: vehicles.filter(v => v.showroomOnline).length
    };
  } catch (error) {
    console.error('Failed to get vehicle stats:', error);
    return {
      total: 0,
      voorraad: 0,
      verkocht_b2c: 0,
      verkocht_b2b: 0,
      arrived: 0,
      papersReceived: 0,
      online: 0
    };
  }
};

// Export mock data for testing
export { mockVehicles };
