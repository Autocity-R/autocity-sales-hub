import { Vehicle, SalesStatus, PaymentStatus, PaintStatus } from "@/types/inventory";
import { FileCategory } from "@/types/inventory";

// Mock data for inventory
const mockVehicles: Vehicle[] = [
  {
    id: "1",
    brand: "Volkswagen",
    model: "Golf",
    licenseNumber: "AB-123-C",
    vin: "WVWZZZ1KZAM123456",
    mileage: 85000,
    importStatus: "ingeschreven",
    arrived: true,
    workshopStatus: "gereed",
    location: "showroom",
    salesStatus: "voorraad",
    showroomOnline: true,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "Kleine kras op rechter voorbumper",
      status: "licht"
    },
    purchasePrice: 12500,
    sellingPrice: 15995,
    paymentStatus: "niet_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-12-05"),
    papersReceived: true,
    papersDate: new Date("2023-12-10"),
    notes: "Klant was zeer tevreden met de auto",
    mainPhotoUrl: "/placeholder.svg",
    photos: ["/placeholder.svg"],
  },
  {
    id: "2",
    brand: "BMW",
    model: "X5",
    licenseNumber: "XY-456-Z",
    vin: "WBAKJ2C51BC123456",
    mileage: 120000,
    importStatus: "ingeschreven",
    arrived: true,
    workshopStatus: "gereed",
    location: "showroom",
    salesStatus: "verkocht_b2b",
    showroomOnline: false,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "Geen schade",
      status: "geen"
    },
    purchasePrice: 35000,
    sellingPrice: 42500,
    paymentStatus: "volledig_betaald",
    cmrSent: true,
    cmrDate: new Date("2023-11-20"),
    papersReceived: true,
    papersDate: new Date("2023-11-25"),
    notes: "Zakelijke lease",
    mainPhotoUrl: "/placeholder.svg",
    photos: ["/placeholder.svg"],
    customerId: "b2b1",
    customerName: "AutoLease B.V.",
  },
  {
    id: "3",
    brand: "Mercedes-Benz",
    model: "C-Klasse",
    licenseNumber: "AB-789-D",
    vin: "WDD2050051R123456",
    mileage: 65000,
    importStatus: "ingeschreven",
    arrived: true,
    workshopStatus: "gereed",
    location: "showroom",
    salesStatus: "verkocht_b2c",
    showroomOnline: false,
    bpmRequested: true,
    bpmStarted: true,
    damage: {
      description: "Lichte kras op achterbumper",
      status: "licht"
    },
    purchasePrice: 28500,
    sellingPrice: 34995,
    paymentStatus: "volledig_betaald",
    paintStatus: "hersteld",
    cmrSent: true,
    cmrDate: new Date("2023-10-15"),
    papersReceived: false,
    papersDate: null,
    notes: "Nog wachten op deel 1 van het kentekenbewijs",
    mainPhotoUrl: "/placeholder.svg",
    photos: ["/placeholder.svg"],
    customerId: "b2c1",
    customerName: "Petra Jansen",
  },
  {
    id: "t1",
    brand: "Audi",
    model: "A4",
    licenseNumber: "DL-555-F",
    vin: "WAUZZZ8K9NA123456",
    mileage: 45000,
    importStatus: "transport_geregeld",
    arrived: false,
    workshopStatus: "wachten",
    location: "onderweg",
    salesStatus: "voorraad",
    showroomOnline: false,
    bpmRequested: false,
    bpmStarted: false,
    damage: {
      description: "Geen schade",
      status: "geen"
    },
    purchasePrice: 18500,
    sellingPrice: 22995,
    paymentStatus: "niet_betaald",
    cmrSent: true,
    cmrDate: new Date("2025-05-15"),
    papersReceived: false,
    papersDate: null,
    notes: "Transport gepland voor volgende week",
    mainPhotoUrl: "/placeholder.svg",
    photos: ["/placeholder.svg"],
  },
  {
    id: "t2",
    brand: "BMW",
    model: "3 Serie",
    licenseNumber: "",
    vin: "WBA5L31080D123456",
    mileage: 65000,
    importStatus: "onderweg",
    arrived: false,
    workshopStatus: "wachten",
    location: "onderweg",
    salesStatus: "voorraad",
    showroomOnline: false,
    bpmRequested: false,
    bpmStarted: false,
    damage: {
      description: "Kleine deuk in voorportier",
      status: "licht"
    },
    purchasePrice: 15800,
    sellingPrice: 19500,
    paymentStatus: "niet_betaald",
    cmrSent: true,
    cmrDate: new Date("2025-05-10"),
    papersReceived: false,
    papersDate: null,
    notes: "Verwachte aankomst einde week",
    mainPhotoUrl: "/placeholder.svg",
    photos: ["/placeholder.svg"],
  },
  {
    id: "t3",
    brand: "Volkswagen",
    model: "Passat",
    licenseNumber: "",
    vin: "WVWZZZ3CZPE123456",
    mileage: 85000,
    importStatus: "niet_gestart",
    arrived: false,
    workshopStatus: "wachten",
    location: "opslag",
    salesStatus: "voorraad",
    showroomOnline: false,
    bpmRequested: false,
    bpmStarted: false,
    damage: {
      description: "Geen schade",
      status: "geen"
    },
    purchasePrice: 13200,
    sellingPrice: 16995,
    paymentStatus: "niet_betaald",
    cmrSent: false,
    cmrDate: null,
    papersReceived: false,
    papersDate: null,
    notes: "Transport nog niet ingepland",
    mainPhotoUrl: "/placeholder.svg",
    photos: ["/placeholder.svg"],
  },
  {
    id: "t4",
    brand: "Mercedes-Benz",
    model: "E-Klasse",
    licenseNumber: "",
    vin: "WDD2130841A123456",
    mileage: 92000,
    importStatus: "niet_gestart",
    arrived: false,
    workshopStatus: "wachten",
    location: "opslag",
    salesStatus: "voorraad",
    showroomOnline: false,
    bpmRequested: false,
    bpmStarted: false,
    damage: {
      description: "Kras op achter bumper",
      status: "licht"
    },
    purchasePrice: 24500,
    sellingPrice: 29995,
    paymentStatus: "niet_betaald",
    cmrSent: false,
    cmrDate: null,
    papersReceived: false,
    papersDate: null,
    notes: "Wacht op pickup in Duitsland",
    mainPhotoUrl: "/placeholder.svg",
    photos: ["/placeholder.svg"],
  }
];

// Fetch all vehicles
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockVehicles), 500);
  });
};

// Fetch vehicles with status "voorraad"
export const fetchInventoryVehicles = async (): Promise<Vehicle[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const inventoryVehicles = mockVehicles.filter(v => v.salesStatus === "voorraad");
      resolve(inventoryVehicles);
    }, 500);
  });
};

// Fetch vehicles with status "verkocht_b2b"
export const fetchB2BVehicles = async (): Promise<Vehicle[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const b2bVehicles = mockVehicles.filter(v => v.salesStatus === "verkocht_b2b");
      resolve(b2bVehicles);
    }, 500);
  });
};

// Fetch vehicles with status "verkocht_b2c"
export const fetchB2CVehicles = async (): Promise<Vehicle[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const b2cVehicles = mockVehicles.filter(v => v.salesStatus === "verkocht_b2c");
      resolve(b2cVehicles);
    }, 500);
  });
};

// Update vehicle
export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(vehicle), 500);
  });
};

// Send email for vehicle
export const sendEmail = async (type: string, vehicleIds: string[]): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 500);
  });
};

// Update selling price
export const updateSellingPrice = async (vehicleId: string, price: number): Promise<Vehicle> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const updatedVehicle = {
        id: vehicleId,
        sellingPrice: price,
      };
      
      resolve(updatedVehicle as Vehicle);
    }, 500);
  });
};

// Update payment status
export const updatePaymentStatus = async (vehicleId: string, status: PaymentStatus): Promise<Vehicle> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const updatedVehicle = {
        id: vehicleId,
        paymentStatus: status,
      };
      
      resolve(updatedVehicle as Vehicle);
    }, 500);
  });
};

// Update paint status
export const updatePaintStatus = async (vehicleId: string, status: PaintStatus): Promise<Vehicle> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const updatedVehicle = {
        id: vehicleId,
        paintStatus: status,
      };
      
      resolve(updatedVehicle as Vehicle);
    }, 500);
  });
};

// Upload vehicle photo
export const uploadVehiclePhoto = async (vehicleId: string, file: File, isMain: boolean): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real app, this would upload the file to a server
      const photoUrl = URL.createObjectURL(file);
      resolve(photoUrl);
    }, 500);
  });
};

// Update sales status
export const updateSalesStatus = async (vehicleId: string, status: SalesStatus): Promise<Vehicle> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const updatedVehicle = {
        id: vehicleId,
        salesStatus: status,
      };
      
      resolve(updatedVehicle as Vehicle);
    }, 500);
  });
};

// Add missing functions
export const createVehicle = async (vehicle: Omit<Vehicle, "id">): Promise<Vehicle> => {
  // In a real app, this would be an API call
  const newVehicle: Vehicle = {
    id: Math.random().toString(36).substring(2, 9),
    ...vehicle,
    photos: vehicle.photos || [],
  };
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(newVehicle), 500);
  });
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  // In a real app, this would be an API call
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 500);
  });
};

export const bulkUpdateVehicles = async (vehicles: Vehicle[]): Promise<Vehicle[]> => {
  // In a real app, this would be an API call
  return new Promise((resolve) => {
    setTimeout(() => resolve(vehicles), 500);
  });
};

export const markVehicleAsDelivered = async (vehicleId: string, deliveryDate = new Date()): Promise<Vehicle> => {
  // In a real app, this would be an API call to update the vehicle status
  return new Promise((resolve) => {
    setTimeout(() => {
      const updatedVehicle = {
        id: vehicleId,
        salesStatus: "afgeleverd" as SalesStatus,
        deliveryDate: deliveryDate,
      };
      
      resolve(updatedVehicle as Vehicle);
    }, 500);
  });
};

export const fetchDeliveredVehicles = async (): Promise<Vehicle[]> => {
  // In a real app, this would be an API call to fetch vehicles with status "afgeleverd"
  const deliveredVehicles: Vehicle[] = [
    {
      id: "del1",
      brand: "Volkswagen",
      model: "Golf",
      licenseNumber: "AB-123-C",
      vin: "WVWZZZ1KZAM123456",
      mileage: 85000,
      importStatus: "ingeschreven",
      arrived: true,
      workshopStatus: "gereed",
      location: "showroom",
      salesStatus: "afgeleverd",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "Kleine kras op rechter voorbumper",
        status: "licht"
      },
      purchasePrice: 12500,
      sellingPrice: 15995,
      paymentStatus: "volledig_betaald",
      paintStatus: "geen_behandeling",
      cmrSent: true,
      cmrDate: new Date("2023-12-05"),
      papersReceived: true,
      papersDate: new Date("2023-12-10"),
      notes: "Klant was zeer tevreden met de auto",
      mainPhotoUrl: "/placeholder.svg",
      photos: ["/placeholder.svg"],
      customerName: "Jan de Vries",
      deliveryDate: new Date("2023-12-15"),
    },
    {
      id: "del2",
      brand: "BMW",
      model: "X5",
      licenseNumber: "XY-456-Z",
      vin: "WBAKJ2C51BC123456",
      mileage: 120000,
      importStatus: "ingeschreven",
      arrived: true,
      workshopStatus: "gereed",
      location: "showroom",
      salesStatus: "afgeleverd",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "Geen schade",
        status: "geen"
      },
      purchasePrice: 35000,
      sellingPrice: 42500,
      paymentStatus: "volledig_betaald",
      paintStatus: "geen_behandeling",
      cmrSent: true,
      cmrDate: new Date("2023-11-20"),
      papersReceived: true,
      papersDate: new Date("2023-11-25"),
      notes: "Zakelijke lease",
      mainPhotoUrl: "/placeholder.svg",
      photos: ["/placeholder.svg"],
      customerName: "AutoLease B.V.",
      deliveryDate: new Date("2023-12-01"),
    },
    {
      id: "del3",
      brand: "Mercedes-Benz",
      model: "C-Klasse",
      licenseNumber: "AB-789-D",
      vin: "WDD2050051R123456",
      mileage: 65000,
      importStatus: "ingeschreven",
      arrived: true,
      workshopStatus: "gereed",
      location: "showroom",
      salesStatus: "afgeleverd",
      showroomOnline: false,
      bpmRequested: true,
      bpmStarted: true,
      damage: {
        description: "Lichte kras op achterbumper",
        status: "licht"
      },
      purchasePrice: 28500,
      sellingPrice: 34995,
      paymentStatus: "volledig_betaald",
      paintStatus: "hersteld",
      cmrSent: true,
      cmrDate: new Date("2023-10-15"),
      papersReceived: false,
      papersDate: null,
      notes: "Nog wachten op deel 1 van het kentekenbewijs",
      mainPhotoUrl: "/placeholder.svg",
      photos: ["/placeholder.svg"],
      customerName: "Petra Jansen",
      deliveryDate: new Date("2023-10-20"),
    },
  ];

  return new Promise((resolve) => {
    setTimeout(() => resolve(deliveredVehicles), 500);
  });
};

// Upload vehicle file
export const uploadVehicleFile = async (file: File, category: FileCategory, vehicleId: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real app, this would upload the file to a server
      const fileUrl = URL.createObjectURL(file);
      resolve(fileUrl);
    }, 500);
  });
};

// Fetch vehicle files
export const fetchVehicleFiles = async (vehicleId: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock files for the vehicle
      const files = [
        {
          id: "file1",
          name: "Kentekenbewijs.pdf",
          url: "/placeholder.pdf",
          category: "cmr",
          vehicleId,
          createdAt: new Date().toISOString(),
        },
        {
          id: "file2",
          name: "Factuur.pdf",
          url: "/placeholder.pdf",
          category: "pickup",
          vehicleId,
          createdAt: new Date().toISOString(),
        },
      ];
      
      resolve(files);
    }, 500);
  });
};
