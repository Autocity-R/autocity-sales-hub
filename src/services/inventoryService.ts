import { Vehicle, PaymentStatus, PaintStatus, FileCategory, VehicleFile } from "@/types/inventory";
import { Contact } from "@/types/customer";

// Use import.meta.env instead of process.env for Vite projects
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch vehicles:", error);
    throw error;
  }
};

export const fetchB2CVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles?status=verkocht_b2c`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch B2C vehicles:", error);
    throw error;
  }
};

export const fetchB2BVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles?status=verkocht_b2b`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch B2B vehicles:", error);
    throw error;
  }
};

export const updateVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicle.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update vehicle:", error);
    throw error;
  }
};

export const sendEmail = async (type: string, vehicleIds: string[]): Promise<any> => {
  try {
    const response = await fetch(`${API_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, vehicleIds }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

export const updateSellingPrice = async (vehicleId: string, price: number): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/selling-price`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ price }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update selling price:", error);
    throw error;
  }
};

export const updatePaymentStatus = async (vehicleId: string, status: PaymentStatus): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/payment-status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update payment status:", error);
    throw error;
  }
};

export const updatePaintStatus = async (vehicleId: string, status: PaintStatus): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/paint-status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update paint status:", error);
    throw error;
  }
};

export const uploadVehiclePhoto = async (vehicleId: string, file: File, isMain: boolean): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("isMain", String(isMain));

    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/photos`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.photoUrl;
  } catch (error: any) {
    console.error("Failed to upload photo:", error);
    throw error;
  }
};

export const markVehicleAsDelivered = async (vehicleId: string): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/delivered`, {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to mark as delivered:", error);
    throw error;
  }
};

export const uploadVehicleFile = async (file: File, category: FileCategory, vehicleId: string): Promise<VehicleFile> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/files`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Failed to upload file:", error);
    throw error;
  }
};

export const fetchVehicleFiles = async (vehicleId?: string): Promise<VehicleFile[]> => {
  if (!vehicleId) return [];

  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/files`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch files:", error);
    return [];
  }
};

// Add new function to change vehicle status
export const changeVehicleStatus = async (vehicleId: string, status: 'verkocht_b2b' | 'verkocht_b2c' | 'voorraad'): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to change vehicle status:", error);
    throw error;
  }
};

// Add new function for updating sales status
export const updateSalesStatus = async (vehicleId: string, status: string): Promise<Vehicle> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/${vehicleId}/sales-status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to update sales status:", error);
    throw error;
  }
};

// Add new function for fetching delivered vehicles
export const fetchDeliveredVehicles = async (): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles?delivered=true`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to fetch delivered vehicles:", error);
    throw error;
  }
};

// Add new function for bulk updating vehicles
export const bulkUpdateVehicles = async (vehicles: Vehicle[]): Promise<Vehicle[]> => {
  try {
    const response = await fetch(`${API_URL}/api/vehicles/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vehicles }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Failed to bulk update vehicles:", error);
    throw error;
  }
};
