
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  linkedButton: string;
  hasAttachment: boolean;
  attachmentType?: "auto-upload" | "generated-contract" | "static-file";
  staticAttachmentType?: string; // For CMR, Pickup documents etc.
  contractConfiguration?: ContractConfiguration;
}

export interface ContractConfiguration {
  contractType: "b2b" | "b2c";
  sections: ContractSection[];
  variables: ContractVariable[];
}

export interface ContractSection {
  id: string;
  name: string;
  content: string;
  isRequired: boolean;
  showCondition?: string; // e.g., "btw_type === 'inclusive'"
}

export interface ContractVariable {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options?: string[]; // For select type
  defaultValue?: any;
  isRequired: boolean;
}

export interface ContractOptions {
  // B2B specific options
  btwType?: "inclusive" | "exclusive";
  bpmIncluded?: boolean;
  vehicleType?: "marge" | "btw";
  maxDamageAmount?: number;
  
  // B2C specific options
  deliveryPackage?: string;
  paymentTerms?: string;
  
  // Common options
  additionalClauses?: string;
  specialAgreements?: string;
}
