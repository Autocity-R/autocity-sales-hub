
import { Lead, LeadActivity, LeadEmail, LeadProposal, LeadStatus, LeadSource, LeadPriority, ActivityType } from "@/types/leads";

// Mock data voor leads
const mockLeads: Lead[] = [
  {
    id: "lead1",
    status: "new",
    priority: "high",
    source: "website",
    firstName: "Jan",
    lastName: "de Vries",
    email: "jan.devries@gmail.com",
    phone: "+31 6 12345678",
    company: "DeVries BV",
    interestedVehicle: "BMW 3 Series",
    budget: 35000,
    timeline: "binnen 2 weken",
    notes: "Geïnteresseerd in lease optie",
    createdAt: "2024-01-15T09:30:00Z",
    updatedAt: "2024-01-15T09:30:00Z",
    assignedTo: "Pieter Jansen",
    responseTime: 2,
    totalActivities: 0,
    conversionProbability: 75
  },
  {
    id: "lead2",
    status: "contacted",
    priority: "medium",
    source: "marktplaats",
    firstName: "Lisa",
    lastName: "Schmidt",
    email: "l.schmidt@hotmail.com",
    phone: "+31 6 87654321",
    interestedVehicle: "Audi A4",
    budget: 28000,
    timeline: "volgende maand",
    notes: "Eerste auto, heeft financiering nodig",
    createdAt: "2024-01-12T14:20:00Z",
    updatedAt: "2024-01-13T10:15:00Z",
    assignedTo: "Sander Vermeulen",
    lastContactDate: "2024-01-13T10:15:00Z",
    nextFollowUpDate: "2024-01-18T09:00:00Z",
    responseTime: 18,
    totalActivities: 2,
    conversionProbability: 60
  },
  {
    id: "lead3",
    status: "proposal",
    priority: "high",
    source: "facebook",
    firstName: "Mark",
    lastName: "Bakker",
    email: "mark@bakkergroup.nl",
    phone: "+31 6 11223344",
    company: "Bakker Group",
    interestedVehicle: "Mercedes E-Class",
    budget: 45000,
    timeline: "deze week",
    notes: "Fleet manager, potentie voor meerdere voertuigen",
    createdAt: "2024-01-10T11:45:00Z",
    updatedAt: "2024-01-16T16:30:00Z",
    assignedTo: "Pieter Jansen",
    lastContactDate: "2024-01-16T16:30:00Z",
    nextFollowUpDate: "2024-01-17T14:00:00Z",
    responseTime: 4,
    totalActivities: 5,
    conversionProbability: 85
  }
];

const mockActivities: LeadActivity[] = [
  {
    id: "act1",
    leadId: "lead2",
    type: "call",
    title: "Eerste contact telefonisch",
    description: "Kennismaking en behoefteanalyse uitgevoerd",
    date: "2024-01-13T10:15:00Z",
    duration: 25,
    outcome: "Positief, wil graag meer informatie",
    nextAction: "Offerte versturen voor Audi A4",
    createdBy: "Sander Vermeulen"
  },
  {
    id: "act2",
    leadId: "lead3",
    type: "email",
    title: "Offerte verstuurd",
    description: "Mercedes E-Class offerte met lease opties",
    date: "2024-01-16T16:30:00Z",
    outcome: "Email geopend en geklikt",
    nextAction: "Follow-up call plannen",
    createdBy: "Pieter Jansen"
  }
];

const mockEmails: LeadEmail[] = [
  {
    id: "email1",
    leadId: "lead3",
    subject: "Offerte Mercedes E-Class - Bakker Group",
    content: "Beste Mark, hierbij de gevraagde offerte...",
    sentAt: "2024-01-16T16:30:00Z",
    opened: true,
    clicked: true,
    replied: false
  }
];

const mockProposals: LeadProposal[] = [
  {
    id: "prop1",
    leadId: "lead3",
    vehicleId: "v001",
    vehicleName: "Mercedes E-Class 2023",
    proposedPrice: 44500,
    validUntil: "2024-01-25T23:59:59Z",
    status: "sent",
    sentAt: "2024-01-16T16:30:00Z",
    notes: "Inclusief lease opties"
  }
];

export const getLeads = (): Lead[] => {
  return mockLeads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getLeadById = (id: string): Lead | undefined => {
  return mockLeads.find(lead => lead.id === id);
};

export const getLeadsByStatus = (status: LeadStatus): Lead[] => {
  return mockLeads.filter(lead => lead.status === status);
};

export const getLeadActivities = (leadId: string): LeadActivity[] => {
  return mockActivities
    .filter(activity => activity.leadId === leadId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getLeadEmails = (leadId: string): LeadEmail[] => {
  return mockEmails
    .filter(email => email.leadId === leadId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
};

export const getLeadProposals = (leadId: string): LeadProposal[] => {
  return mockProposals
    .filter(proposal => proposal.leadId === leadId)
    .sort((a, b) => new Date(b.sentAt || '').getTime() - new Date(a.sentAt || '').getTime());
};

export const updateLeadStatus = (leadId: string, status: LeadStatus): Lead | undefined => {
  const lead = mockLeads.find(l => l.id === leadId);
  if (lead) {
    lead.status = status;
    lead.updatedAt = new Date().toISOString();
  }
  return lead;
};

export const addLeadActivity = (activity: Omit<LeadActivity, 'id' | 'date'>): LeadActivity => {
  const newActivity: LeadActivity = {
    ...activity,
    id: `act${mockActivities.length + 1}`,
    date: new Date().toISOString()
  };
  
  mockActivities.push(newActivity);
  
  // Update lead
  const lead = mockLeads.find(l => l.id === activity.leadId);
  if (lead) {
    lead.totalActivities += 1;
    lead.lastContactDate = newActivity.date;
    lead.updatedAt = newActivity.date;
  }
  
  return newActivity;
};

export const createLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'totalActivities'>): Lead => {
  const newLead: Lead = {
    ...leadData,
    id: `lead${mockLeads.length + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalActivities: 0
  };
  
  mockLeads.push(newLead);
  return newLead;
};

export const getLeadStats = () => {
  const total = mockLeads.length;
  const byStatus = mockLeads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<LeadStatus, number>);
  
  const avgResponseTime = mockLeads
    .filter(lead => lead.responseTime)
    .reduce((sum, lead) => sum + (lead.responseTime || 0), 0) / 
    mockLeads.filter(lead => lead.responseTime).length;
  
  return {
    total,
    byStatus,
    avgResponseTime: Math.round(avgResponseTime || 0)
  };
};
