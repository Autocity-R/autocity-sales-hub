import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id: string;
}

// ─── Gmail Auth (zelfde patroon als process-lead-emails) ───

async function createJWTAssertion(sa: ServiceAccount): Promise<string> {
  const userToImpersonate = 'garantie@auto-city.nl';
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
  ].join(' ');

  const privateKey = await jose.importPKCS8(sa.private_key.replace(/\\n/g, '\n'), 'RS256');

  return new jose.SignJWT({ scope: scopes })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: sa.private_key_id })
    .setIssuedAt()
    .setIssuer(sa.client_email)
    .setSubject(userToImpersonate)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime('1h')
    .sign(privateKey);
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await createJWTAssertion(sa);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail auth failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ─── Email body decoder ───

function decodeEmailBody(payload: any): { plain: string; html: string } {
  let plain = '';
  let html = '';
  function walk(part: any) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data)
      plain += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    else if (part.mimeType === 'text/html' && part.body?.data)
      html += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    if (part.parts) part.parts.forEach(walk);
  }
  walk(payload);
  return { plain, html };
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

// ─── Verzonden mail van garantie@ inlezen (richting 'uitgaand') ───

function extractEmails(value: string): string[] {
  if (!value) return [];
  const out: string[] = [];
  const re = /[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) out.push(m[0].toLowerCase());
  return out;
}

/** Ruwe HTML/tekst tot leesbare platte tekst (voor vergelijken van duplicaten). */
function toPlain(s: string): string {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function syncSentMessages(
  supabase: any,
  gmailHeaders: Record<string, string>,
  afterTimestamp: number,
  maxResults = 40,
): Promise<{ stored: number; matched: number; skipped: number }> {
  const result = { stored: 0, matched: 0, skipped: 0 };
  const query = `in:sent after:${afterTimestamp}`;
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers: gmailHeaders },
  );
  if (!listRes.ok) {
    console.error(`⚠️ Gmail sent-list mislukt (${listRes.status}): ${await listRes.text()}`);
    return result;
  }
  const sentMessages = (await listRes.json()).messages || [];
  console.log(`📤 ${sentMessages.length} verzonden berichten gevonden`);

  for (const msg of sentMessages) {
    try {
      // Al bekend op Gmail-id? → niets te doen
      const { data: known } = await supabase
        .from('garantie_emails')
        .select('id')
        .eq('gmail_message_id', msg.id)
        .maybeSingle();
      if (known) { result.skipped++; continue; }

      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: gmailHeaders },
      );
      if (!msgRes.ok) continue;
      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];

      const messageId = getHeader(headers, 'Message-ID');
      const subject = getHeader(headers, 'Subject');
      const fromRaw = getHeader(headers, 'From');
      const dateStr = getHeader(headers, 'Date');
      const sentAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
      const inReplyTo = getHeader(headers, 'In-Reply-To');
      const references = getHeader(headers, 'References');

      const recipients = [
        ...extractEmails(getHeader(headers, 'To')),
        ...extractEmails(getHeader(headers, 'Cc')),
      ].filter((e) => !e.includes('auto-city.nl'));
      if (!recipients.length) { result.skipped++; continue; }

      const { plain, html } = decodeEmailBody(msgData.payload);
      const body = plain || html || '';
      if (!body.trim()) { result.skipped++; continue; }

      // ── Thread bepalen: eerst via References/In-Reply-To, dan via ontvanger ──
      let threadId: string | null = null;
      const refIds: string[] = String(`${inReplyTo} ${references}`).match(/<[^>]+>/g) || [];
      for (const ref of refIds) {
        const { data: refEmail } = await supabase
          .from('garantie_emails')
          .select('thread_id')
          .eq('message_id', ref)
          .maybeSingle();
        if (refEmail?.thread_id) { threadId = refEmail.thread_id; break; }
      }
      if (!threadId) {
        const { data: thread } = await supabase
          .from('garantie_email_threads')
          .select('id')
          .in('klant_email', recipients)
          .order('laatste_email_op', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (thread) threadId = thread.id;
      }
      // Geen bestaande garantie-thread → geen garantiemail, niet aanmaken
      if (!threadId) { result.skipped++; continue; }

      // ── Duplicaat van een via het CRM verstuurd antwoord? ──
      if (messageId) {
        const { data: byMsgId } = await supabase
          .from('garantie_emails')
          .select('id')
          .eq('message_id', messageId)
          .maybeSingle();
        if (byMsgId) {
          await supabase.from('garantie_emails').update({ gmail_message_id: msg.id }).eq('id', byMsgId.id);
          result.matched++;
          continue;
        }
      }
      const windowStart = new Date(new Date(sentAt).getTime() - 30 * 60_000).toISOString();
      const windowEnd = new Date(new Date(sentAt).getTime() + 30 * 60_000).toISOString();
      const { data: nearby } = await supabase
        .from('garantie_emails')
        .select('id, body, gmail_message_id')
        .eq('thread_id', threadId)
        .eq('richting', 'uitgaand')
        .gte('received_at', windowStart)
        .lte('received_at', windowEnd);
      const plainNew = toPlain(body);
      const dup = (nearby || []).find((r: any) => {
        if (r.gmail_message_id) return false;
        const a = toPlain(r.body).slice(0, 120);
        return a.length > 20 && plainNew.includes(a);
      });
      if (dup) {
        await supabase
          .from('garantie_emails')
          .update({ gmail_message_id: msg.id, message_id: messageId || undefined })
          .eq('id', dup.id);
        result.matched++;
        continue;
      }

      // ── Nieuw uitgaand bericht opslaan ──
      const senderName = fromRaw.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || 'Autocity Garantie';
      const { error: insErr } = await supabase.from('garantie_emails').insert({
        thread_id: threadId,
        message_id: messageId || `gmail-sent-${msg.id}`,
        gmail_message_id: msg.id,
        sender: senderName,
        sender_email: 'garantie@auto-city.nl',
        subject,
        body,
        received_at: sentAt,
        richting: 'uitgaand',
        gelezen: true,
        reactie_status: 'verstuurd',
        definitieve_reactie: body,
        verstuurd_op: sentAt,
        verstuurd_door: senderName,
      });
      if (insErr) {
        if (insErr.code === '23505' || insErr.message?.includes('duplicate')) { result.skipped++; continue; }
        console.error(`❌ Uitgaand bericht opslaan mislukt: ${insErr.message}`);
        continue;
      }

      // ── Klok stopt: thread bijwerken + openstaande inkomende mails afvinken ──
      const { data: threadRow } = await supabase
        .from('garantie_email_threads')
        .select('laatste_email_op')
        .eq('id', threadId)
        .maybeSingle();
      const newest =
        threadRow?.laatste_email_op && new Date(threadRow.laatste_email_op) > new Date(sentAt)
          ? threadRow.laatste_email_op
          : sentAt;
      await supabase
        .from('garantie_email_threads')
        .update({ laatste_email_op: newest, updated_at: new Date().toISOString() })
        .eq('id', threadId);
      await supabase
        .from('garantie_emails')
        .update({ reactie_status: 'verstuurd', definitieve_reactie: body, verstuurd_op: sentAt })
        .eq('thread_id', threadId)
        .eq('richting', 'inkomend')
        .eq('reactie_status', 'wacht_op_beoordeling')
        .lte('received_at', sentAt);

      result.stored++;
      console.log(`✅ Uitgaand opgeslagen: ${subject} → ${recipients.join(', ')}`);
    } catch (err: any) {
      console.error(`❌ Fout bij verzonden bericht ${msg.id}: ${err.message}`);
    }
  }
  return result;
}

// ─── Garantie Specialist Prompt ───

const GARANTIE_SPECIALIST_PROMPT = `
Je bent de Autocity Garantie Specialist. Je werkt voor Autocity, een 55-jarig familiebedrijf (BOVAG autobedrijf, jong gebruikte premium auto's).

Je bent rechtvaardig waar Autocity verantwoordelijk is, maar streng waar klanten geen recht hebben — altijd met empathische communicatie.

GARANTIE KENNIS:

WETTELIJKE GARANTIE (altijd van toepassing, gratis):
- 12 maanden vanaf aankoop
- Dekt: verborgen gebreken die bij aankoop al aanwezig waren
- Eerste 12 maanden: bewijslast bij Autocity

BOVAG GARANTIE (alleen als klant €995 heeft betaald):
- 12 maanden aanvullend op wettelijke garantie
- Uitgebreidere dekking

GEDEKT: verborgen fabricagefouten bij aankoop, materiaaldefecten niet zichtbaar bij verkoop, elektrische defecten niet door gebruik, motor/transmissie problemen door fabricage, werkmanschap fouten bij reparaties

NIET GEDEKT: normale slijtage (remmen/banden/koppeling), onderhoud (olie/filters), misbruik, modificaties door derden, ongevalschade, gebreken buiten EER ontstaan

BESLISSINGSPROCES:
1. Verificeer garantieperiode en BOVAG status
2. Classificeer het gebrek (gedekt of niet)
3. Bij twijfel eerste 12 maanden: voordeel van de klant
4. Na 12 maanden: klant moet bewijzen

COMMUNICATIE:
- Altijd in correct Nederlands, u/uw
- Professioneel, empathisch, respectvol
- Transparant over wel/niet gedekt
- Autocity DNA: 55 jaar ervaring, BOVAG kwaliteit, familiebedrijf warmte

Je reageert altijd als iemand die het complete dossier kent. Je verwijst naar eerdere gesprekken als dat relevant is.
Geef je antwoord altijd als JSON object met deze velden:
{
  "analyse": "wat zegt de klant en wat betekent dit voor de case",
  "beslissing": "gedekt|niet_gedekt|onderzoek|meer_info_nodig",
  "case_samenvatting": "korte update van de volledige case status",
  "reactie_voorstel": "volledige email reactie aan de klant"
}
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;
    const googleSAKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const serviceAccount: ServiceAccount = JSON.parse(googleSAKey);

    // Optionele eenmalige backfill van verzonden items: { backfillDays: 30 }
    let backfillDays = 0;
    try {
      const raw = req.method === 'POST' ? await req.text() : '';
      if (raw) backfillDays = Number(JSON.parse(raw)?.backfillDays) || 0;
    } catch { /* geen body */ }

    // ─── Stap 1: Watermerk ophalen ───
    const { data: config } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'garantie_email_laatste_sync')
      .single();

    const sindsWanneer = config?.value ?? new Date().toISOString();
    const afterTimestamp = Math.floor(new Date(sindsWanneer).getTime() / 1000);

    console.log(`📧 Garantie emails ophalen sinds: ${sindsWanneer}`);

    // ─── Stap 2: Gmail ophalen ───
    const accessToken = await getAccessToken(serviceAccount);
    const gmailHeaders = { Authorization: `Bearer ${accessToken}` };

    const query = `in:inbox after:${afterTimestamp}`;
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
      { headers: gmailHeaders }
    );

    if (!listRes.ok) {
      const err = await listRes.text();
      throw new Error(`Gmail list failed (${listRes.status}): ${err}`);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];
    console.log(`📬 ${messages.length} garantie emails gevonden`);

    let processed = 0;

    for (const msg of messages) {
      try {
        // Haal volledige email op
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: gmailHeaders }
        );
        if (!msgRes.ok) continue;
        const msgData = await msgRes.json();

        const headers = msgData.payload?.headers || [];
        const messageId = getHeader(headers, 'Message-ID');
        const from = getHeader(headers, 'From');
        const subject = getHeader(headers, 'Subject');
        const inReplyTo = getHeader(headers, 'In-Reply-To');
        const dateStr = getHeader(headers, 'Date');
        const receivedAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

        // Extract sender email
        const emailMatch = from.match(/<([^>]+)>/);
        const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : from.toLowerCase().trim();
        const senderName = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || senderEmail;

        // Skip eigen emails (van garantie@auto-city.nl)
        if (senderEmail.includes('auto-city.nl')) {
          console.log(`⏭️ Skipping eigen email van ${senderEmail}`);
          continue;
        }

        // Decode body
        const { plain, html } = decodeEmailBody(msgData.payload);
        const body = plain || html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';

        if (!body) {
          console.log(`⏭️ Skipping lege email ${messageId}`);
          continue;
        }

        // ─── Stap 3: Thread matching ───
        let threadId: string | null = null;

        // Check 1: In-Reply-To header → bestaande email in ons systeem
        if (inReplyTo) {
          const { data: existingEmail } = await supabase
            .from('garantie_emails')
            .select('thread_id')
            .eq('message_id', inReplyTo)
            .single();
          if (existingEmail) threadId = existingEmail.thread_id;
        }

        // Check 2: Zelfde afzender met open thread
        if (!threadId) {
          const { data: existingThread } = await supabase
            .from('garantie_email_threads')
            .select('id')
            .eq('klant_email', senderEmail)
            .eq('thread_status', 'open')
            .order('laatste_email_op', { ascending: false })
            .limit(1)
            .single();
          if (existingThread) threadId = existingThread.id;
        }

        // Check 3: Nieuwe thread aanmaken
        if (!threadId) {
          const { data: newThread, error: threadError } = await supabase
            .from('garantie_email_threads')
            .insert({
              klant_email: senderEmail,
              klant_naam: senderName,
              onderwerp: subject,
              eerste_email_op: receivedAt,
              laatste_email_op: receivedAt,
              aantal_emails: 0,
              thread_status: 'open',
            })
            .select('id')
            .single();

          if (threadError) {
            console.error(`❌ Thread aanmaken mislukt:`, threadError.message);
            continue;
          }
          threadId = newThread!.id;
          console.log(`🆕 Nieuwe thread aangemaakt: ${threadId}`);
        }

        // ─── Stap 4: Email opslaan (ON CONFLICT DO NOTHING via unique message_id) ───
        const { data: insertedEmail, error: emailError } = await supabase
          .from('garantie_emails')
          .upsert(
            {
              thread_id: threadId,
              message_id: messageId || `gmail-${msg.id}`,
              sender: senderName,
              sender_email: senderEmail,
              subject,
              body,
              received_at: receivedAt,
              richting: 'inkomend',
              gelezen: false,
              reactie_status: 'wacht_op_beoordeling',
            },
            { onConflict: 'message_id', ignoreDuplicates: true }
          )
          .select('id')
          .single();

        if (emailError) {
          // Duplicate → skip
          if (emailError.code === '23505' || emailError.message?.includes('duplicate')) {
            console.log(`⏭️ Duplicate email skipped: ${messageId}`);
            continue;
          }
          console.error(`❌ Email opslaan mislukt:`, emailError.message);
          continue;
        }

        const emailId = insertedEmail?.id;
        if (!emailId) {
          console.log(`⏭️ Email was duplicate (no id returned)`);
          continue;
        }

        // ─── Stap 5: Thread context laden ───
        const { data: threadHistory } = await supabase
          .from('garantie_emails')
          .select('richting, body, sara_reactie_voorstel, definitieve_reactie, received_at')
          .eq('thread_id', threadId)
          .order('received_at', { ascending: true });

        const historyText = (threadHistory || [])
          .map((e: any) => {
            const content =
              e.richting === 'inkomend' ? e.body : e.definitieve_reactie || e.sara_reactie_voorstel || '';
            return `[${e.richting.toUpperCase()} - ${e.received_at}]\n${content}`;
          })
          .join('\n\n');

        // ─── Tijdsafhankelijke Nederlandse aanhef (Europe/Amsterdam) ───
        const uur = Number(
          new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false })
            .format(new Date()),
        );
        const dagdeel = uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond';
        const achternaam = String(senderName || '').replace(/[<>]/g, '').trim().split(/\s+/).slice(-1)[0] || '';
        const aanhef = achternaam && !achternaam.includes('@') && achternaam.length > 1
          ? `${dagdeel} heer ${achternaam},`
          : `${dagdeel},`;

        // ─── Stap 6: Claude analyse ───
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system: GARANTIE_SPECIALIST_PROMPT,
            messages: [
              {
                role: 'user',
                content: `CASE GESCHIEDENIS:\n${historyText}\n\nNIEUWE EMAIL VAN KLANT:\nVan: ${senderName} <${senderEmail}>\nOnderwerp: ${subject}\n\n${body}\n\nAnalyseer deze email in context van de volledige case. Geef JSON terug.\n\nBELANGRIJK voor "reactie_voorstel": begin de tekst met exact deze aanhef op de eerste regel, gevolgd door een lege regel: "${aanhef}". Geen Engelse of stijve juridische opening, geen handtekening (die wordt automatisch toegevoegd).`,
              },
            ],
          }),
        });

        let analyse = '';
        let beslissing = '';
        let caseSamenvatting = '';
        let reactieVoorstel = '';

        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          const responseText = claudeData.content?.[0]?.text || '';

          try {
            // Extract JSON from response (may be wrapped in markdown code block)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              analyse = parsed.analyse || '';
              beslissing = parsed.beslissing || '';
              caseSamenvatting = parsed.case_samenvatting || '';
              reactieVoorstel = parsed.reactie_voorstel || '';
              if (reactieVoorstel && !/^(goedemorgen|goedemiddag|goedenavond|beste|geachte)/i.test(reactieVoorstel.trim())) {
                reactieVoorstel = `${aanhef}\n\n${reactieVoorstel.trim()}`;
              }
            }
          } catch {
            console.error('⚠️ Claude response was not valid JSON, using raw text');
            analyse = responseText;
            beslissing = 'onderzoek';
          }
        } else {
          console.error(`❌ Claude API error: ${claudeRes.status}`);
          beslissing = 'onderzoek';
          analyse = 'Automatische analyse niet beschikbaar';
        }

        // ─── Stap 7: Resultaten opslaan ───
        await supabase
          .from('garantie_emails')
          .update({
            sara_analyse: analyse,
            sara_reactie_voorstel: reactieVoorstel,
            sara_beslissing: beslissing,
          })
          .eq('id', emailId);

        // Update thread
        await supabase
          .from('garantie_email_threads')
          .update({
            laatste_email_op: receivedAt,
            aantal_emails: (threadHistory?.length || 0),
            case_samenvatting: caseSamenvatting || undefined,
            sara_beslissing: beslissing || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', threadId);

        // Markeer als gelezen in Gmail
        await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
          {
            method: 'POST',
            headers: { ...gmailHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
          }
        );

        processed++;
        console.log(`✅ Email verwerkt: ${subject} van ${senderEmail} → ${beslissing}`);
      } catch (emailErr: any) {
        console.error(`❌ Fout bij verwerken email ${msg.id}:`, emailErr.message);
      }
    }

    // ─── Stap 8: Watermerk updaten ───
    await supabase.from('system_config').upsert({
      key: 'garantie_email_laatste_sync',
      value: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log(`🏁 Klaar: ${processed}/${messages.length} emails verwerkt`);

    return new Response(JSON.stringify({ processed, total: messages.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Fatale fout:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
