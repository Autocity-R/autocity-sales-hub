export const AGENT_IDS = {
  Marco: 'b1000000-0000-0000-0000-000000000001',
  Lisa: 'b2000000-0000-0000-0000-000000000002',
  Daan: 'b3000000-0000-0000-0000-000000000003',
  Kevin: 'b4000000-0000-0000-0000-000000000004',
  Sara: 'b5000000-0000-0000-0000-000000000005',
  Alex: 'b6000000-0000-0000-0000-000000000006',
} as const;

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  color: { bg: string; border: string; text: string; gradient: string };
  quickQuestions: string[];
}

export const AGENTS: AgentConfig[] = [
  {
    id: AGENT_IDS.Marco,
    name: 'Marco',
    role: 'Import & Transport Manager',
    color: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500', gradient: 'from-blue-500 to-blue-600' },
    quickQuestions: [
      'Welke auto\'s hebben vandaag actie nodig?',
      'Wat zijn de kritiekste bottlenecks?',
      'CMR status overzicht',
      'Welke auto\'s lopen het langst vast?',
      'B2B papieren status',
      'Welke auto\'s zijn onderweg?',
      'Wat is de impact op onze omloopsnelheid?',
    ],
  },
  {
    id: AGENT_IDS.Lisa,
    name: 'Lisa',
    role: 'Afleverplanner',
    color: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-500', gradient: 'from-green-500 to-green-600' },
    quickQuestions: [
      'Welke afleveringen staan vandaag gepland?',
      'Welke auto\'s zijn niet afleverklaar?',
      'Welke checklists zijn incompleet?',
      'Zijn er garantieproblemen bij recente afleveringen?',
    ],
  },
  {
    id: AGENT_IDS.Daan,
    name: 'Daan',
    role: 'Verkoopleider',
    color: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500', gradient: 'from-orange-500 to-orange-600' },
    quickQuestions: [
      'Welke auto\'s staan het langst in voorraad?',
      'Wat is de totale voorraadwaarde?',
      'Welke auto\'s moeten geprijsd worden?',
      'Geef een voorraad samenvatting',
    ],
  },
  {
    id: AGENT_IDS.Kevin,
    name: 'Kevin',
    role: 'Head of Purchases',
    color: { bg: 'bg-teal-500', border: 'border-teal-500', text: 'text-teal-500', gradient: 'from-teal-500 to-teal-600' },
    quickQuestions: [
      'Welke auto\'s vereisen actie qua prijs?',
      'Hoe staat onze voorraad t.o.v. de markt?',
      'Welke auto\'s staan het langst online?',
      'Geef een overzicht van de marktsignalen',
      'Welke auto\'s zijn onder marktwaarde geprijsd?',
      'Hoeveel leads genereren onze auto\'s?',
    ],
  },
  {
    id: AGENT_IDS.Sara,
    name: 'Sara',
    role: 'Garantie Tracker',
    color: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-500', gradient: 'from-purple-500 to-purple-600' },
    quickQuestions: [
      'Hoeveel open garantieclaims zijn er?',
      'Welke claims staan >14 dagen open?',
      'Geef een overzicht van klantopvolging',
      'Zijn er urgente claims?',
    ],
  },
  {
    id: AGENT_IDS.Alex,
    name: 'Alex',
    role: 'CEO Overzicht',
    color: { bg: 'bg-purple-800', border: 'border-purple-800', text: 'text-purple-800', gradient: 'from-purple-800 to-purple-900' },
    quickQuestions: [
      'Geef een dagelijkse briefing',
      'Wat zijn de belangrijkste alerts?',
      'Hoe presteert het team vandaag?',
      'Welke escalaties zijn er?',
    ],
  },
];

export const ROLE_AGENT_ACCESS: Record<string, string[]> = {
  admin: ['Marco', 'Lisa', 'Daan', 'Sara', 'Alex'],
  owner: ['Marco', 'Lisa', 'Daan', 'Sara', 'Alex'],
  manager: ['Marco', 'Lisa', 'Daan', 'Sara', 'Alex'],
  verkoper: ['Daan'],
  operationeel: ['Marco', 'Lisa'],
  aftersales_manager: ['Lisa', 'Sara'],
};

export const getAccessibleAgents = (userRole: string | null): AgentConfig[] => {
  if (!userRole) return [];
  const allowedNames = ROLE_AGENT_ACCESS[userRole] || [];
  return AGENTS.filter(a => allowedNames.includes(a.name));
};
