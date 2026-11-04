import { describe, expect, it } from 'vitest';
import { claimReferences, resolveClaimReference } from './garantieClaimReference';
describe('garantie e-mailreferenties', () => {
  it('herkent alleen begrensde volledige nummers', () => { expect(claimReferences('gc-2026-0042 GC-2026-0042')).toEqual(['GC-2026-0042']); expect(claimReferences('GC-2026-00423')).toEqual([]); });
  it('koppelt geen conflicterende nummers', async () => { expect(await resolveClaimReference({},'GC-2026-0001 GC-2026-0002',['a@example.invalid'])).toEqual({claimId:null,explicit:true}); });
  it('behoudt afzendercontrole', async () => { const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:'id',claim_contact_email:'a@example.invalid'}})})})})}; expect((await resolveClaimReference(db,'GC-2026-0042',['b@example.invalid'])).claimId).toBeNull(); expect((await resolveClaimReference(db,'GC-2026-0042',['a@example.invalid'])).claimId).toBe('id'); });
});