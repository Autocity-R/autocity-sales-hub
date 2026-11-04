import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WarrantyClaim } from '@/types/warranty';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContactForm } from '@/components/customers/ContactForm';
import { validClaimEmail, validClaimPhone } from '@/lib/claimNumber';
import { formatEventTs } from '@/lib/tijdlijn';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { syncWorkOrderToWerkplaatsCalendar } from '@/services/werkplaatsCalendarService';

export function ClaimContactEditor({ claim, onSaved }: { claim: WarrantyClaim; onSaved: (data: Partial<WarrantyClaim>) => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(claim.customerId || null);
  const [name, setName] = useState(claim.customerName);
  const [phone, setPhone] = useState(claim.customerPhone || '');
  const [email, setEmail] = useState(claim.customerEmail || '');
  const [card, setCard] = useState(true);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { userRole, isAdmin, canManageWarrantyClaims } = useRoleAccess();
  const allowed = canManageWarrantyClaims() || userRole === 'operationeel_directeur';
  const cardAllowed = isAdmin || ['manager', 'verkoper', 'werkplaats_chef', 'aftersales_manager', 'operationeel_directeur'].includes(userRole || '');
  const createAllowed = isAdmin || ['manager', 'verkoper', 'aftersales_manager', 'werkplaats_chef', 'operationeel'].includes(userRole || '');
  const { toast } = useToast(); const qc = useQueryClient();
  const loadHistory = async () => {
    const { data, error } = await supabase.from('warranty_claim_wijzigingen').select('*, actor:profiles!warranty_claim_wijzigingen_door_fkey(first_name,last_name)').eq('claim_id', claim.id).order('created_at', { ascending: false });
    if (!error) setHistory(data || []);
    else { const result = await supabase.from('warranty_claim_wijzigingen').select('*').eq('claim_id', claim.id).order('created_at', { ascending: false }); setHistory(result.data || []); }
  };
  useEffect(() => { loadHistory(); }, [claim.id]);
  useEffect(() => {
    if (!linking) return;
    let cancelled = false;
    const timer = setTimeout(() => { supabase.rpc('garantie_klant_zoeken', { p_query: query }).then(({ data, error }) => {
      if (!cancelled) { setCustomers(data || []); if (error) setError(error.message); }
    }); }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, linking]);
  const begin = () => { setCustomerId(claim.customerId || null); setName(claim.customerName); setPhone(claim.customerPhone || ''); setEmail(claim.customerEmail || ''); setCard(true); setError(''); setLinking(false); setOpen(true); };
  const save = async () => {
    if (!name.trim() || !validClaimPhone(phone) || !validClaimEmail(email)) { setError('Controleer naam, Nederlands telefoonnummer en e-mailadres.'); return; }
    setSaving(true); setError('');
    try {
      const { error } = await supabase.rpc('garantie_contact_wijzigen', { p_claim_id: claim.id, p_customer_id: customerId, p_naam: name.trim(), p_telefoon: phone.trim(), p_email: email.trim(), p_klantkaart: !!customerId && card && cardAllowed });
      if (error) throw error;
      onSaved({ customerId: customerId || '', customerName: name.trim(), customerPhone: phone.trim(), customerEmail: email.trim() });
      await qc.invalidateQueries({ queryKey: ['warrantyClaims'] }); await loadHistory(); setOpen(false);
      toast({ title: 'Contactgegevens bijgewerkt' });
      const { data: orders } = await supabase.from('work_orders').select('id,branch,calendar_event_id').eq('warranty_claim_id', claim.id).not('calendar_event_id', 'is', null);
      for (const order of orders || []) await syncWorkOrderToWerkplaatsCalendar(order.id, order.branch || 'rotterdam');
    } catch (e: any) { setError(e.message || 'Opslaan mislukt'); }
    finally { setSaving(false); }
  };
  return <>
    {allowed && <Button variant="outline" size="sm" onClick={begin}>Contactgegevens wijzigen</Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Contactgegevens wijzigen</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label htmlFor="claim-contact-name">Naam</Label><Input id="claim-contact-name" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><Label htmlFor="claim-contact-phone">Telefoon</Label><Input id="claim-contact-phone" value={phone} onChange={e => setPhone(e.target.value)} /></div>
        <div><Label htmlFor="claim-contact-email">E-mail</Label><Input id="claim-contact-email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        {customerId && cardAllowed && <label className="flex items-center gap-2 text-sm"><Checkbox checked={card} onCheckedChange={v => setCard(v === true)} />Ook bijwerken in de klantkaart</label>}
        <Button variant="outline" size="sm" onClick={() => setLinking(v => !v)}>Andere klant koppelen</Button>
        {linking && <div className="space-y-2"><Input aria-label="Klant zoeken" placeholder="Naam, telefoon, e-mail of kenteken" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="max-h-40 overflow-y-auto">{customers.map(c => <Button key={c.id} variant="ghost" className="w-full justify-start h-auto text-left whitespace-normal" onClick={() => { setCustomerId(c.id); setName(c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ')); setPhone(c.phone || ''); setEmail(c.email || ''); setLinking(false); }}>{c.company_name || `${c.first_name || ''} ${c.last_name || ''}`} · {c.phone} · {c.email}</Button>)}</div>
          <Button variant="outline" onClick={() => { setCustomerId(null); setLinking(false); }}>Handmatige klant</Button>
          {createAllowed && <Button variant="outline" onClick={() => setCreating(true)}>Nieuwe klant aanmaken in CRM</Button>}
        </div>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</Button>
      </div>
    </DialogContent></Dialog>
    <Dialog open={creating} onOpenChange={setCreating}><DialogContent><DialogHeader><DialogTitle>Nieuwe klant</DialogTitle></DialogHeader><ContactForm contactType="b2c" onCancel={() => setCreating(false)} onSuccess={c => { setCustomerId(c.id); setName(c.companyName || `${c.firstName} ${c.lastName}`); setPhone(c.phone || ''); setEmail(c.email || ''); setLinking(false); }} /></DialogContent></Dialog>
    <section className="mt-4 border-t border-border pt-3"><h4 className="font-medium text-sm">Contactwijzigingen</h4>{!history.length ? <p className="text-xs text-muted-foreground">Nog geen contactwijzigingen</p> : history.map(h => <div key={h.id} className="text-xs py-2 border-b border-border"><div>{formatEventTs(h.created_at, true)} · door {h.actor ? [h.actor.first_name,h.actor.last_name].filter(Boolean).join(' ') : h.door || 'Systeem'}</div>{['customer_id','naam','telefoon','email'].filter(k => h.oud?.[k] !== h.nieuw?.[k]).map(k => <div key={k}>{k}: {h.oud?.[k] || '—'} → {h.nieuw?.[k] || '—'}</div>)}</div>)}</section>
  </>;
}