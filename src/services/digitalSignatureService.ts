import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";

export interface SignatureSession {
  id: string;
  vehicleId: string;
  contractType: "b2b" | "b2c";
  contractOptions: ContractOptions;
  token: string;
  expiresAt: Date;
  status: "pending" | "signed" | "expired";
  signedAt?: Date;
  signerName?: string;
  signerEmail?: string;
  signerIP?: string;
  signatureData?: string; // Base64 encoded signature image
  createdAt: Date;
}

// Mock storage - in productie zou dit in een database staan
let signatureSessions: SignatureSession[] = [];

// Initialize with a test session for demo purposes
const initializeTestSession = () => {
  const testSession: SignatureSession = {
    id: "test_session_demo",
    vehicleId: "test-4",
    contractType: "b2b",
    contractOptions: {
      btwType: "exclusive",
      bpmIncluded: false,
      vehicleType: "btw",
      maxDamageAmount: 1000,
      deliveryPackage: "standard",
      paymentTerms: "immediate",
      additionalClauses: "Voertuig wordt geleverd inclusief alle originele papieren en sleutels.",
      specialAgreements: "Aflevering binnen 5 werkdagen na ondertekening contract."
    },
    token: "demo_token_123456789",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dagen geldig
    status: "pending",
    createdAt: new Date()
  };
  
  signatureSessions.push(testSession);
  console.log("Test session initialized with token:", testSession.token);
};

// Initialize test session on service load
initializeTestSession();

export const createSignatureSession = async (
  vehicle: Vehicle,
  contractType: "b2b" | "b2c",
  contractOptions: ContractOptions
): Promise<SignatureSession> => {
  const session: SignatureSession = {
    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    vehicleId: vehicle.id,
    contractType,
    contractOptions,
    token: generateSecureToken(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dagen geldig
    status: "pending",
    createdAt: new Date()
  };

  signatureSessions.push(session);
  console.log("Created signature session:", session.id);
  
  return session;
};

export const getSignatureSession = (token: string): SignatureSession | null => {
  const session = signatureSessions.find(s => s.token === token);
  
  if (!session) {
    console.log("Session not found for token:", token);
    console.log("Available sessions:", signatureSessions.map(s => s.token));
    return null;
  }
  
  // Check if expired
  if (new Date() > session.expiresAt) {
    session.status = "expired";
    return session;
  }
  
  return session;
};

export const signContract = async (
  token: string,
  signerName: string,
  signerEmail: string,
  signatureData: string,
  signerIP: string
): Promise<boolean> => {
  const session = getSignatureSession(token);
  
  if (!session || session.status !== "pending") {
    return false;
  }
  
  // Update session with signature data
  session.status = "signed";
  session.signedAt = new Date();
  session.signerName = signerName;
  session.signerEmail = signerEmail;
  session.signerIP = signerIP;
  session.signatureData = signatureData;
  
  console.log("Contract signed by:", signerName, "for vehicle:", session.vehicleId);
  
  // In productie: update vehicle status, send notifications, etc.
  return true;
};

export const getSignatureSessionsByVehicle = (vehicleId: string): SignatureSession[] => {
  return signatureSessions.filter(s => s.vehicleId === vehicleId);
};

export const generateSignatureUrl = (session: SignatureSession): string => {
  // In productie zou dit een echte URL zijn
  return `${window.location.origin}/contract/sign/${session.token}`;
};

const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateSignatureSession = (session: SignatureSession): {
  isValid: boolean;
  error?: string;
} => {
  if (session.status === "expired") {
    return { isValid: false, error: "Ondertekeningssessie is verlopen" };
  }
  
  if (session.status === "signed") {
    return { isValid: false, error: "Contract is al ondertekend" };
  }
  
  if (new Date() > session.expiresAt) {
    return { isValid: false, error: "Ondertekeningssessie is verlopen" };
  }
  
  return { isValid: true };
};
