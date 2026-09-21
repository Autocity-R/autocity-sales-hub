// Leest (ALLEEN LEZEN) de mailbox(en) van Autocity en werkt de import-status van
// voertuigen bij op basis van Belastingdienst-, RDW- en EU/EVA-mails.
// Matcht op VIN in onderwerp of body. Verstuurt/verplaatst/verwijdert nooit mail.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import { applyStatusToVehicle, findVehiclesByVin } from '../_shared/importStatus.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id: string;
}

const DEFAULT_MAILBOXES = [
  'import@auto-city.nl',
  'inkoop@auto-city.nl',
  'verkoop@auto-city.nl',
  'info@auto-city.nl',
  'administratie@auto-city.nl',
];

async function getAccessToken(sa: ServiceAccount, mailbox: string): Promise<string> {
  const privateKey = await jose.importPKCS8(sa.private_key.replace(/\\n/g, '\n'), 'RS256');
  const jwt = await new jose.SignJWT({ scope: 'https://www.googleapis.com/auth/gmail.readonly' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: sa.private_key_id })
    .setIssuedAt()
    .setIssuer(sa.client_email)
    .setSubject(mailbox)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime('1h')
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Gmail auth mislukt voor ${mailbox} (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

function decodeBody(payload: any): string {
  let out = '';
  const walk = (part: any) => {
    if (!part) return;
    if ((part.mimeType === 'text/plain' || part.mimeType === 'text/html') && part.body?.data) {
      try {
        out += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')) + '\n';
      } catch { /* negeren */ }
    }
    if (part.parts) part.parts.forEach(walk);
  };
  walk(payload);
  return out
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ');
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

/** Alle VIN-kandidaten (17 tekens, geen I/O/Q) uit onderwerp + body. */
function extractVins(text: string): string[] {
  const found = new Set<string>();
  const re = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;
  let m: RegExpExecArray | null;
  const cleaned = String(text || '').replace(/[\s.:;,()[\]]+/g, ' ');
  while ((m = re.exec(cleaned)) !== null) {
    const v = m[0].toUpperCase();
    if (/\d/.test(v) && /[A-Z]/.test(v)) found.add(v);
  }
  return [...found];
}

/**
 * Leidt de import-status ONDERWERP-GESTUURD af (v6).
 * Reden: de RDW-mail "Aanvraag EU/EVA-voertuig registreren…" beschrijft in de body
 * het hele vervolgproces (incl. "kentekenbewijs"), waardoor auto's bij de allereerste
 * aanvraag-mail direct op 'ingeschreven' sprongen. Hoge statussen (ingeschreven,
 * goedgekeurd) komen daarom UITSLUITEND uit de onderwerpregel; de body is alleen
 * een fallback voor veilige statussen (bpm_betaald, aanvraag_ontvangen).
 */
function inferStatus(subject: string, body: string): string | null {
  const subj = String(subject || '').toLowerCase();
  const bod = String(body || '').toLowerCase();

  // Ontkenningen: mails die juist melden dat iets NIET gelukt/ontvangen is
  const negatedSubj = /niet ontvangen|nog niet ontvangen|niet ingeschreven|afgewezen|afgekeurd|kan niet worden/.test(subj);

  // Aanvraag-/afspraak-onderwerpen mogen NOOIT tot ingeschreven/goedgekeurd leiden
  const isRequestSubject = /aanvraag|aanvragen|registreren|besteld|bestellen|afspraak|maken/.test(subj);

  // Keuringsafspraak: géén statuswijziging
  if (/afspraak op keuringsstation|keuringsafspraak/.test(subj)) return null;

  // BPM betaald (onderwerp, daarna veilige body-fallback)
  if (/betaalbericht bpm|bpm.{0,20}betaald/.test(subj)) return 'bpm_betaald';
  if (/betaalbericht bpm|betaling bpm is ontvangen/.test(bod)) return 'bpm_betaald';

  // Hoge statussen: UITSLUITEND uit het onderwerp, nooit bij aanvraag-/afspraakmails
  if (!negatedSubj && !isRequestSubject) {
    if (/kentekenbewijs|tenaamstelling|voertuig is ingeschreven|inschrijving voertuig (is )?(voltooid|gereed)/.test(subj))
      return 'ingeschreven';
    if (/goedgekeurd|keuringsrapport|voertuig is (definitief )?goedgekeurd/.test(subj)) return 'goedgekeurd';
  }

  // Aanvraag ontvangen / in behandeling (onderwerp, daarna veilige body-fallback)
  if (/bevestiging van uw aanvraag|ontvangstbevestiging|aanvraag (is )?(ontvangen|in behandeling)/.test(subj))
    return 'aanvraag_ontvangen';
  if (/wij hebben uw aangifte ontvangen/.test(bod)) return 'aanvraag_ontvangen';

  // EU/EVA-aanvraagmail → aangemeld
  if (/eu\/eva|eu-eva|eva-voertuig/.test(subj) && /aanvraag|registreren/.test(subj))
    return 'aangemeld';

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const log: string[] = [];
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let days = 2;
    let dryRun = false;
    try {
      const body = req.method === 'POST' ? await req.json() : {};
      if (body?.days) days = Math.min(Number(body.days) || 2, 60);
      if (body?.dry_run) dryRun = true;
    } catch { /* geen body */ }
    const url = new URL(req.url);
    if (url.searchParams.get('days')) days = Math.min(Number(url.searchParams.get('days')) || 2, 60);
    if (url.searchParams.get('dry_run') === 'true') dryRun = true;

    const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY ontbreekt in de secrets.');
    const sa: ServiceAccount = JSON.parse(raw);

    const mailboxes = (Deno.env.get('IMPORT_MAILBOXES') || DEFAULT_MAILBOXES.join(','))
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const after = Math.floor((Date.now() - days * 86400_000) / 1000);
    const query =
      `after:${after} (belastingdienst OR rdw OR bpm OR "eu/eva" OR "EU/EVA-voertuig" OR betaalbericht OR kentekenbewijs)`;

    const results: any[] = [];
    let scanned = 0;
    let matched = 0;
    let updated = 0;
    const mailboxStatus: Record<string, string> = {};

    for (const mailbox of mailboxes) {
      let token: string;
      try {
        token = await getAccessToken(sa, mailbox);
      } catch (e) {
        mailboxStatus[mailbox] = `geen toegang: ${e instanceof Error ? e.message : e}`;
        log.push(`⚠️ ${mailbox}: geen toegang`);
        continue;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`,
        { headers },
      );
      if (!listRes.ok) {
        mailboxStatus[mailbox] = `list mislukt (${listRes.status}): ${await listRes.text()}`;
        continue;
      }
      const messages = (await listRes.json()).messages || [];
      mailboxStatus[mailbox] = `${messages.length} berichten gevonden`;
      log.push(`📬 ${mailbox}: ${messages.length} berichten`);

      for (const msg of messages) {
        scanned++;
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject`,
          { headers },
        );
        if (!msgRes.ok) continue;
        const data = await msgRes.json();
        const hdrs = data.payload?.headers || [];
        const subject = getHeader(hdrs, 'Subject');
        const snippet = String(data.snippet || '');

        const vins = extractVins(`${subject} ${snippet}`);
        if (vins.length === 0) continue;
        const status = inferStatus(subject);
        if (!status) continue;

        for (const vin of vins) {
          const vehicles = await findVehiclesByVin(supabase, vin);
          if (vehicles.length === 0) continue;
          matched++;
          for (const v of vehicles) {
            if (dryRun) {
              results.push({ mailbox, subject, vin, status, vehicle_id: v.id, dry_run: true });
              continue;
            }
            const r = await applyStatusToVehicle(supabase, v, status, {
              source: 'email_import',
              externalReference: `gmail:${msg.id}`,
              ignoreTransportGuard: true,
            });
            if (r.updated) updated++;
            results.push({ mailbox, subject, vin, ...r });
          }
        }
      }
    }

    console.log(`✅ Import-status uit mail: ${scanned} mails, ${matched} VIN-matches, ${updated} updates`);

    return new Response(
      JSON.stringify({ success: true, days, dry_run: dryRun, scanned, matched, updated, mailboxes: mailboxStatus, results, log }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('❌ import-status-from-email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Onbekende fout', log }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
