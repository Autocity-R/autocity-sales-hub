import { LeadDisplayConfig } from "@/types/leads";

export const leadDisplayConfig: LeadDisplayConfig = {
  status: {
    'new': { label: 'Nieuw', color: 'bg-blue-500', textColor: 'text-blue-700' },
    'contacted': { label: 'Contact Opgenomen', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
    'qualified': { label: 'Gekwalificeerd', color: 'bg-purple-500', textColor: 'text-purple-700' },
    'proposal': { label: 'Voorstel', color: 'bg-orange-500', textColor: 'text-orange-700' },
    'negotiation': { label: 'Onderhandeling', color: 'bg-indigo-500', textColor: 'text-indigo-700' },
    'won': { label: 'Verkocht', color: 'bg-green-500', textColor: 'text-green-700' },
    'lost': { label: 'Verloren', color: 'bg-red-500', textColor: 'text-red-700' }
  },
  source: {
    'website': { label: 'Eigen Website', icon: '🌐', color: 'bg-purple-100' },
    'facebook': { label: 'AutoScout24', icon: '🚗', color: 'bg-blue-100' }, // Note: autoscout24 emails map to 'facebook' in DB
    'autotrack': { label: 'AutoTrack', icon: '🔍', color: 'bg-green-100' },
    'marktplaats': { label: 'Marktplaats', icon: '🛒', color: 'bg-orange-100' },
    'referral': { label: 'Referentie', icon: '👥', color: 'bg-pink-100' },
    'phone': { label: 'Telefoon', icon: '📞', color: 'bg-yellow-100' },
    'other': { label: 'Overig', icon: '📝', color: 'bg-gray-100' }
  }
};
