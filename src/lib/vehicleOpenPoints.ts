import { dagKey } from './tijdlijn';
export interface VehicleOpenPoint {
  id: string; soort: string; groep: string; omschrijving: string; status: string;
  planned_at?: string | null; due_date?: string | null; ordered_at?: string | null;
  assigned_name?: string | null; claim_nummer?: string | null; via_ander_record?: boolean;
}
export const openGroup = (group: string) => ({ poets: 'Poetsen', uitdeuken: 'Uitdeuken', spuit: 'Schadeherstel/spuiten', schadeherstel: 'Schadeherstel/spuiten', werkplaats: 'Werkplaats' }[group] || group);
export const openStatus = (status: string) => ({ afgerond: 'Wacht op goedkeuring', bezig: 'Bezig', gepauzeerd: 'Gepauzeerd', ingepland: 'Ingepland', pending: 'Actief', in_progress: 'In behandeling' }[status] || status);
const past = (date: string | null | undefined, now: Date) => !!date && (/^\d{4}-\d{2}-\d{2}$/.test(date) ? date < dagKey(now.toISOString()) : Number.isFinite(Date.parse(date)) && Date.parse(date) < +now);
export const isOpenPointLate = (p: VehicleOpenPoint, now = new Date()) => past(p.due_date, now) || (p.soort !== 'factuur' && past(p.planned_at, now));
export function sortOpenPoints(points: VehicleOpenPoint[], now = new Date()) {
  const rank = (p: VehicleOpenPoint) => isOpenPointLate(p, now) ? 0 : ['bezig', 'gepauzeerd'].includes(p.status) ? 1 : p.planned_at || p.due_date ? 2 : 3;
  return [...points].sort((a, b) => rank(a) - rank(b) || (Date.parse(a.planned_at || a.due_date || '') || Infinity) - (Date.parse(b.planned_at || b.due_date || '') || Infinity) || a.id.localeCompare(b.id));
}