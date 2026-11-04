import { describe, expect, it } from 'vitest';
import { VehicleOpenPoint, isOpenPointLate, openGroup, openStatus, sortOpenPoints } from './vehicleOpenPoints';
const point = (id: string, rest: Partial<VehicleOpenPoint> = {}): VehicleOpenPoint => ({ id, soort:'order',groep:'poets',omschrijving:'test',status:'ingepland',...rest });
describe('open punten', () => {
  it('mapt disciplines en afgerond wacht op goedkeuring', () => { expect(openGroup('poets')).toBe('Poetsen'); expect(openGroup('spuit')).toBe('Schadeherstel/spuiten'); expect(openStatus('afgerond')).toBe('Wacht op goedkeuring'); });
  it('datumdeadline is pas te laat na de NL kalenderdag', () => { expect(isOpenPointLate(point('1',{due_date:'2026-11-04'}),new Date('2026-11-04T22:30:00Z'))).toBe(false); expect(isOpenPointLate(point('1',{due_date:'2026-11-04'}),new Date('2026-11-04T23:30:00Z'))).toBe(true); });
  it('sorteert te laat, bezig, ingepland, zonder datum', () => { const now=new Date('2026-11-04T12:00:00Z'); expect(sortOpenPoints([point('none'),point('planned',{planned_at:'2026-11-05T12:00:00Z'}),point('paused',{status:'gepauzeerd'}),point('late',{due_date:'2026-11-03'})],now).map(p=>p.id)).toEqual(['late','paused','planned','none']); });
});