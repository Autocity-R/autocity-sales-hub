
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { generateContract, GeneratedContract } from "./contractService";

export interface StoredContract {
  id: string;
  vehicleId: string;
  customerId?: string;
  contractType: "b2b" | "b2c";
  options: ContractOptions;
  htmlContent: string;
  textContent: string;
  fileName: string;
  pdfUrl?: string;
  signatureUrl?: string;
  createdAt: Date;
  isDelivered: boolean;
}

// Mock storage for contracts (in real app this would be a database)
const contractStorage: StoredContract[] = [];

export const storeContract = async (
  vehicle: Vehicle,
  contractType: "b2b" | "b2c",
  options: ContractOptions,
  signatureUrl?: string
): Promise<StoredContract> => {
  // Generate the contract
  const generatedContract = await generateContract(vehicle, contractType, options, signatureUrl);
  
  // Create stored contract record
  const contractId = `contract-${vehicle.id}-${Date.now()}`;
  const storedContract: StoredContract = {
    id: contractId,
    vehicleId: vehicle.id,
    customerId: vehicle.customerId,
    contractType,
    options,
    htmlContent: generatedContract.htmlContent,
    textContent: generatedContract.content,
    fileName: generatedContract.fileName,
    pdfUrl: generatedContract.pdfUrl,
    signatureUrl: generatedContract.signatureUrl,
    createdAt: new Date(),
    isDelivered: vehicle.salesStatus === "afgeleverd"
  };
  
  // Store in mock storage (in real app this would save to database)
  contractStorage.push(storedContract);
  
  console.log("Contract stored:", contractId);
  
  return storedContract;
};

export const getContractByVehicleId = async (vehicleId: string): Promise<StoredContract | null> => {
  // In real app this would query the database
  const contract = contractStorage.find(c => c.vehicleId === vehicleId);
  return contract || null;
};

export const getContractById = async (contractId: string): Promise<StoredContract | null> => {
  // In real app this would query the database
  const contract = contractStorage.find(c => c.id === contractId);
  return contract || null;
};

export const linkContractToVehicle = async (
  vehicleId: string,
  contractId: string,
  contractUrl: string,
  contractType: "b2b" | "b2c",
  contractOptions: ContractOptions
): Promise<boolean> => {
  try {
    // In real app this would update the database
    console.log("Linking contract to vehicle:", { vehicleId, contractId, contractUrl, contractType });
    return true;
  } catch (error) {
    console.error("Failed to link contract to vehicle:", error);
    return false;
  }
};

export const getAllContractsForVehicle = async (vehicleId: string): Promise<StoredContract[]> => {
  // In real app this would query all contracts for a vehicle
  return contractStorage.filter(c => c.vehicleId === vehicleId);
};
