import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function ClaimNumber({ number, claimId }: { number?: string | null; claimId?: string | null }) {
  const [loaded, setLoaded] = useState<string | null>(null);
  const { toast } = useToast();
  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    if (!number && claimId) supabase.from('warranty_claims').select('claim_nummer').eq('id', claimId).maybeSingle().then(({ data }) => {
      if (!cancelled) setLoaded(data?.claim_nummer || null);
    });
    return () => { cancelled = true; };
  }, [number, claimId]);
  const value = number || loaded;
  if (!value) return <span>Garantieclaim</span>;
  return <span className="inline-flex items-center gap-1 text-sm"><span>{value}</span><Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" title="Claimnummer kopiëren" aria-label="Claimnummer kopiëren" onClick={async e => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(value); toast({ title: 'Claimnummer gekopieerd' }); }
    catch { toast({ title: 'Kopiëren niet mogelijk', variant: 'destructive' }); }
  }}><Copy className="h-3 w-3" /></Button></span>;
}