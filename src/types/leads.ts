export type LeadStatus = 'new' | 'contacted' | 'appointment' | 'won' | 'lost';
export type LeadSource = 'website' | 'facebook' | 'autotrack' | 'marktplaats' | 'referral' | 'phone' | 'other';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'proposal' | 'follow-up';

export interface Lead {
  id: string;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  
  // Contact informatie
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  
  // Lead details
  interestedVehicle?: string;
  budget?: number;
  timeline?: string;
  notes: string;
  
  // Tracking
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  
  // Metrics
  responseTime?: number; // in hours
  totalActivities: number;
  conversionProbability: number; // percentage
  
  // AI Scoring
  lead_score?: number; // 0-100
  response_required?: boolean;
  last_ai_analysis?: string;
  lead_temperature?: 'hot' | 'warm' | 'cold' | 'ice';
  lead_type?: string;
  intent_classification?: string;
  urgency_level?: 'low' | 'medium' | 'high' | 'urgent';
  
  // New fields (backwards compatible)
  vehicleUrl?: string;
  parsingConfidence?: number;
  platformMetadata?: any;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  title: string;
  description: string;
  date: string;
  duration?: number; // in minutes
  outcome?: string;
  nextAction?: string;
  createdBy: string;
}

export interface LeadEmail {
  id: string;
  leadId: string;
  subject: string;
  content: string;
  sentAt: string;
  opened?: boolean;
  clicked?: boolean;
  replied?: boolean;
}

export interface LeadProposal {
  id: string;
  leadId: string;
  vehicleId: string;
  vehicleName: string;
  proposedPrice: number;
  validUntil: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  sentAt?: string;
  notes?: string;
}

export interface LeadFollowUpTrigger {
  id: string;
  leadId: string;
  type: 'proefrit' | 'bezichtiging' | 'voorstel' | 'algemeen';
  description: string;
  scheduledDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completedDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface LeadDisplayConfig {
  status: {
    [K in LeadStatus]: {
      label: string;
      color: string;
      textColor: string;
    };
  };
  source: {
    [K in LeadSource]: {
      label: string;
      icon: string;
      color: string;
    };
  };
}

export interface LeadSearchRequest {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  
  // Zoekopdracht details
  requestedBrand: string;
  requestedModel: string;
  requestedYear?: string;
  requestedFuelType?: string;
  requestedTransmission?: string;
  minPrice?: number;
  maxPrice?: number;
  maxKilometers?: number;
  
  // Status en tracking
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  priority: LeadPriority;
  requestDate: string;
  expiryDate?: string;
  notes: string;
  
  // Verkoper info
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Notificaties
  notifyWhenAvailable: boolean;
  lastNotified?: string;
}
