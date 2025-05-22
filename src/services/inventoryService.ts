import { Vehicle, SalesStatus, PaymentStatus, PaintStatus } from "@/types/inventory";

// Mock API for demonstration
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  // Simulating API call
  return [
    {
      id: "1",
      brand: "Audi",
      model: "A4 2.0 TDI S Line",
      licenseNumber: "HNZ-60-N",
      vin: "WAUZZZ8K9NA123456",
      mileage: 45000,
      importStatus: "niet_gestart",
      arrived: false,
      workshopStatus: "wachten",
      location: "opslag",
      salesStatus: "voorraad",
      showroomOnline: false,
      bpmRequested: false,
      bpmStarted: false,
      damage: {
        description: "Kras op voorportier",
        status: "licht"
      },
      purchasePrice: 18500,
      sellingPrice: 0,
      paymentStatus: "niet_betaald",
      cmrSent: false,
      cmrDate: null,
      papersReceived: false,
      papersDate: null,
      notes: "",
      mainPhotoUrl: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800",
        "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800"
      ],
      createdAt: new Date(2024, 4, 1).toISOString() // May 1, 2024
    },
    {
      id: "2",
      brand: "BMW",
      model: "3-serie 320d M Sport",
      licenseNumber: "AB-123-C",
      vin: "WBA8E9C50GK123456",
      mileage: 62000,
      importStatus: "onderweg",
      arrived: false,
      workshopStatus: "wachten",
      location: "opslag",
      salesStatus: "voorraad",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "",
        status: "geen"
      },
      purchasePrice: 24500,
      sellingPrice: 0,
      paymentStatus: "niet_betaald",
      cmrSent: true,
      cmrDate: new Date(2023, 5, 15),
      papersReceived: false,
      papersDate: null,
      notes: "Verwacht eind deze week",
      mainPhotoUrl: "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800",
        "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800"
      ],
      createdAt: new Date(2024, 3, 15).toISOString() // April 15, 2024
    },
    {
      id: "3",
      brand: "Mercedes",
      model: "E-Klasse E220d AMG Line",
      licenseNumber: "ZX-789-Y",
      vin: "WDD2130421A123456",
      mileage: 38000,
      importStatus: "aangekomen",
      arrived: true,
      workshopStatus: "poetsen",
      location: "showroom",
      salesStatus: "voorraad",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "Deuk in achterbumper",
        status: "middel"
      },
      purchasePrice: 32000,
      sellingPrice: 0,
      paymentStatus: "niet_betaald",
      cmrSent: true,
      cmrDate: new Date(2023, 4, 20),
      papersReceived: true,
      papersDate: new Date(2023, 5, 1),
      notes: "Klant heeft interesse getoond",
      mainPhotoUrl: "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800",
        "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800"
      ],
      createdAt: new Date(2024, 2, 10).toISOString() // March 10, 2024
    },
    {
      id: "4",
      brand: "Volkswagen",
      model: "Golf GTI Performance",
      licenseNumber: "VW-456-G",
      vin: "WVWZZZ1KZCM123456",
      mileage: 25000,
      importStatus: "ingeschreven",
      arrived: true,
      workshopStatus: "gereed",
      location: "showroom",
      salesStatus: "verkocht_b2b",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "",
        status: "geen"
      },
      purchasePrice: 28500,
      sellingPrice: 31500,
      paymentStatus: "volledig_betaald",
      cmrSent: true,
      cmrDate: new Date(2023, 5, 15),
      papersReceived: true,
      papersDate: new Date(2023, 5, 20),
      notes: "Verkocht aan Autobedrijf Jansen",
      mainPhotoUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800",
      ],
      createdAt: new Date(2024, 3, 5).toISOString(), // April 5, 2024
      customerId: "b2b-1"
    },
    {
      id: "5",
      brand: "Audi",
      model: "Q5 2.0 TDI Quattro",
      licenseNumber: "TR-789-P",
      vin: "WAUZZZ8R2DA987654",
      mileage: 42000,
      importStatus: "ingeschreven",
      arrived: true,
      workshopStatus: "gereed",
      location: "showroom",
      salesStatus: "verkocht_b2b",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "",
        status: "geen"
      },
      purchasePrice: 35000,
      sellingPrice: 39500,
      paymentStatus: "aanbetaling",
      cmrSent: true,
      cmrDate: new Date(2023, 6, 10),
      papersReceived: true,
      papersDate: new Date(2023, 6, 15),
      notes: "Verkocht aan AutoPlaza",
      mainPhotoUrl: "https://images.unsplash.com/photo-1606220838315-056192d5e927?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1606220838315-056192d5e927?q=80&w=800",
      ],
      createdAt: new Date(2024, 3, 15).toISOString(), // April 15, 2024
      customerId: "b2b-2"
    },
    // Add some B2C vehicles
    {
      id: "6",
      brand: "Mercedes-Benz",
      model: "C-Klasse C200 AMG Line",
      licenseNumber: "KG-892-L",
      vin: "WDC2050401R123456",
      mileage: 18000,
      importStatus: "ingeschreven",
      arrived: true,
      workshopStatus: "klaar_voor_aflevering",
      location: "showroom",
      salesStatus: "verkocht_b2c",
      paintStatus: "hersteld",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "",
        status: "geen"
      },
      purchasePrice: 45000,
      sellingPrice: 49500,
      paymentStatus: "volledig_betaald",
      cmrSent: true,
      cmrDate: new Date(2024, 4, 10),
      papersReceived: true,
      papersDate: new Date(2024, 4, 15),
      notes: "Klant afspraak maken voor aflevering",
      mainPhotoUrl: "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800",
      ],
      createdAt: new Date(2024, 4, 5).toISOString(), // May 5, 2024
      customerId: "c1",
      customerName: "Jan de Vries"
    },
    {
      id: "7",
      brand: "BMW",
      model: "5-serie 520i Executive",
      licenseNumber: "ZD-123-P",
      vin: "WBA5A31080C123456",
      mileage: 31000,
      importStatus: "goedgekeurd",
      arrived: true,
      workshopStatus: "in_werkplaats",
      location: "werkplaats",
      salesStatus: "verkocht_b2c",
      paintStatus: "in_behandeling",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "Kleine deuk rechter deur",
        status: "licht"
      },
      purchasePrice: 38000,
      sellingPrice: 42500,
      paymentStatus: "aanbetaling",
      cmrSent: true,
      cmrDate: new Date(2024, 5, 5),
      papersReceived: true,
      papersDate: new Date(2024, 5, 10),
      notes: "Nog lakwerk nodig voor aflevering",
      mainPhotoUrl: "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800",
      ],
      createdAt: new Date(2024, 4, 20).toISOString(), // May 20, 2024
      customerId: "c2",
      customerName: "Petra Janssen"
    },
    // Add an already delivered vehicle
    {
      id: "8",
      brand: "Volvo",
      model: "XC60 T5 Inscription",
      licenseNumber: "VK-375-G",
      vin: "YV1ZW60UCJ2123456",
      mileage: 22000,
      importStatus: "ingeschreven",
      arrived: true,
      workshopStatus: "gereed",
      location: "showroom",
      salesStatus: "afgeleverd",
      paintStatus: "hersteld",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "",
        status: "geen"
      },
      purchasePrice: 52000,
      sellingPrice: 57000,
      paymentStatus: "volledig_betaald",
      cmrSent: true,
      cmrDate: new Date(2024, 3, 15),
      papersReceived: true,
      papersDate: new Date(2024, 3, 20),
      notes: "Auto succesvol afgeleverd",
      mainPhotoUrl: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800",
      photos: [
        "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800",
      ],
      createdAt: new Date(2024, 3, 1).toISOString(), // April 1, 2024
      customerId: "c3",
      customerName: "Marieke de Boer",
      deliveryDate: new Date(2024, 4, 15) // May 15, 2024
    }
  ];
};

// Fetch B2B vehicles
export const fetchB2BVehicles = async (): Promise<Vehicle[]> => {
  const vehicles = await fetchVehicles();
  return vehicles.filter(vehicle => vehicle.salesStatus === "verkocht_b2b");
};

// Fetch B2C vehicles
export const fetchB2CVehicles = async (): Promise<Vehicle[]> => {
  const vehicles = await fetchVehicles();
  return vehicles.filter(vehicle => vehicle.salesStatus === "verkocht_b2c");
};

// Fetch Delivered vehicles
export const fetchDeliveredVehicles = async (): Promise<Vehicle[]> => {
  const vehicles = await fetchVehicles();
  return vehicles.filter(vehicle => vehicle.salesStatus === "afgeleverd");
};

// Mock update function
export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  // Simulating API call
  return vehicle;
};

// Mock bulk update function
export const bulkUpdateVehicles = async (ids: string[], updates: Partial<Vehicle>): Promise<Vehicle[]> => {
  // Simulating API call
  console.log("Bulk updating vehicles:", ids, updates);
  return []; // Would normally return updated vehicles
};

// Function to change sales status
export const updateSalesStatus = async (id: string, status: SalesStatus): Promise<Vehicle> => {
  // Simulating API call
  console.log(`Changing vehicle ${id} status to ${status}`);
  return { id } as Vehicle; // Would normally return updated vehicle
};

// Function to update payment status
export const updatePaymentStatus = async (id: string, status: PaymentStatus): Promise<Vehicle> => {
  // Simulating API call
  console.log(`Changing vehicle ${id} payment status to ${status}`);
  return { id } as Vehicle; // Would normally return updated vehicle
};

// Function to delete vehicle
export const deleteVehicle = async (id: string): Promise<boolean> => {
  // Simulating API call
  console.log(`Deleting vehicle ${id}`);
  return true;
};

// Mock create function
export const createVehicle = async (vehicle: Omit<Vehicle, "id">): Promise<Vehicle> => {
  // Simulating API call
  return {
    ...vehicle,
    id: Math.random().toString(36).substring(7) // Generate random ID
  };
};

// Mock email sending function
export const sendEmail = async (type: string, vehicleIds: string[]): Promise<boolean> => {
  // Simulating API call
  console.log(`Sending ${type} email for vehicles:`, vehicleIds);
  return true;
};

// Mock photo upload function
export const uploadVehiclePhoto = async (vehicleId: string, file: File, isMain: boolean): Promise<string> => {
  // Simulating API call
  console.log(`Uploading photo for vehicle ${vehicleId}, main photo: ${isMain}`);
  // Return a random image URL for demonstration purposes
  const imageUrls = [
    "https://images.unsplash.com/photo-1489824904134-891ab64532f1?q=80&w=800",
    "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800",
    "https://images.unsplash.com/photo-1563720223489-c94d197a0a0e?q=80&w=800",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800"
  ];
  return imageUrls[Math.floor(Math.random() * imageUrls.length)];
};

// Update selling price
export const updateSellingPrice = async (id: string, price: number): Promise<Vehicle> => {
  // Simulating API call
  console.log(`Updating selling price for vehicle ${id} to ${price}`);
  return { id, sellingPrice: price } as Vehicle;
};

// Send different types of B2B emails
export const sendB2BEmail = async (type: string, vehicleId: string): Promise<boolean> => {
  // Simulating API call
  console.log(`Sending ${type} email for B2B vehicle ${vehicleId}`);
  return true;
};

// Update paint status
export const updatePaintStatus = async (id: string, status: PaintStatus): Promise<Vehicle> => {
  // Simulating API call
  console.log(`Updating paint status for vehicle ${id} to ${status}`);
  return { id, paintStatus: status } as Vehicle;
};

// Function to mark vehicle as delivered with date
export const markVehicleAsDelivered = async (id: string): Promise<Vehicle> => {
  // Simulating API call
  const deliveryDate = new Date();
  console.log(`Marking vehicle ${id} as delivered on ${deliveryDate}`);
  return { 
    id, 
    salesStatus: "afgeleverd", 
    deliveryDate 
  } as Vehicle;
};
