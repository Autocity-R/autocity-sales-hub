
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
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
