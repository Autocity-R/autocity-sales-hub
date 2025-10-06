import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractAutoTrackData(body: string, htmlBody: string) {
  const doc = new DOMParser().parseFromString(htmlBody, 'text/html');
  
  // Extract clean message
  let cleanMessage = '';
  const berichtMatch = body.match(/\*?Bericht\*?[:\s]+([\s\S]*?)(?=\*?Met vriendelijke groet|Gewenste|Wat vond je|©|autotrack is onderdeel|$)/i);
  if (berichtMatch) {
    cleanMessage = berichtMatch[1]
      .replace(/\*Naam\*?:.*$/im, '')
      .replace(/\*E-mailadres\*?:.*$/im, '')
      .replace(/\*Telefoonnummer\*?:.*$/im, '')
      .replace(/autotrack is onderdeel van.*$/i, '')
      .replace(/postbus.*$/i, '')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  
  // Extract vehicle URL (DOM-based with fallback)
  let vehicleUrl = '';
  if (doc) {
    const links = Array.from(doc.querySelectorAll('a'));
    const autotrackLink = links.find(a => a.getAttribute('href')?.includes('autotrack.nl/a/'));
    if (autotrackLink) {
      vehicleUrl = autotrackLink.getAttribute('href') || '';
    }
  }
  if (!vehicleUrl) {
    vehicleUrl = htmlBody.match(/https?:\/\/www\.autotrack\.nl\/a\/[^\s<>"]+/i)?.[0] || '';
  }
  
  // Extract customer email
  let customerEmail = null;
  const emailMatch = body.match(/\*E-mailadres:\*\s*([^\s<>\*]+@[^\s<>\*]+)/i) ||
                     body.match(/E-mailadres:\s*([^\s<>\*]+@[^\s<>\*]+)/i);
  if (emailMatch) customerEmail = emailMatch[1].trim();
  
  return { cleanMessage, vehicleUrl, customerEmail };
}

function extractAutoScout24Data(body: string, htmlBody: string) {
  const doc = new DOMParser().parseFromString(htmlBody, 'text/html');
  
  // Extract clean message (DOM-based with fallback)
  let cleanMessage = '';
  if (doc) {
    const messageHeader = Array.from(doc.querySelectorAll('td, div')).find(el => 
      el.textContent.includes('Bericht van de koper')
    );
    if (messageHeader) {
      let nextElement = messageHeader.nextElementSibling;
      while(nextElement && nextElement.textContent.trim().length < 2) {
        nextElement = nextElement.nextElementSibling;
      }
      if(nextElement) {
        cleanMessage = nextElement.textContent.trim();
      }
    }
  }
  if (!cleanMessage) {
    const msgMatch = body.match(/Bericht van de koper\s*([\s\S]*?)(?=Met vriendelijke groet|Bekijk advertentie)/i);
    if (msgMatch) cleanMessage = msgMatch[1].trim();
  }
  
  // Extract vehicle URL (DOM-based with fallback)
  let vehicleUrl = '';
  if (doc) {
    const adLink = Array.from(doc.querySelectorAll('a')).find(el => 
      el.textContent.includes('Bekijk advertentie')
    );
    if (adLink) {
      vehicleUrl = adLink.getAttribute('href') || '';
    }
  }
  if (!vehicleUrl) {
    vehicleUrl = htmlBody.match(/https?:\/\/(?:www\.)?autoscout24\.(?:nl|com)\/aanbod\/[^\s<>"]+/i)?.[0] || '';
  }
  
  // Extract customer email (DOM-based with fallback)
  let customerEmail = null;
  if (doc) {
    const elements = Array.from(doc.querySelectorAll('td, span, div'));
    const replyToElement = elements.find(el => el.textContent.includes('Antwoorden op:'));
    if (replyToElement) {
      const mailtoLink = replyToElement.querySelector('a[href^="mailto:"]');
      if (mailtoLink) {
        customerEmail = mailtoLink.getAttribute('href')?.replace('mailto:', '');
      }
    }
  }
  if (!customerEmail) {
    const replyMatch = htmlBody.match(/Antwoorden op:.*?<([^>]+)>/i) || 
                       htmlBody.match(/Antwoorden op:\s*([^\s<>]+@[^\s<>]+)/i);
    if (replyMatch) customerEmail = replyMatch[1].trim();
  }
  
  return { cleanMessage, vehicleUrl, customerEmail };
}

function extractMarktplaatsData(body: string, htmlBody: string) {
  const doc = new DOMParser().parseFromString(htmlBody, 'text/html');
  
  // Extract clean message
  let cleanMessage = '';
  const vraagMatch = body.match(/(?:Vraag|Bericht)[:\s]+([\s\S]*?)(?=Verkoper|Bekijk advertentie|$)/i);
  if (vraagMatch) {
    cleanMessage = vraagMatch[1]
      .replace(/Verkoper[\s\S]*$/i, '')
      .replace(/Bekijk advertentie[\s\S]*$/i, '')
      .trim();
  }
  
  // Extract vehicle URL (DOM-based with fallback)
  let vehicleUrl = '';
  if (doc) {
    const links = Array.from(doc.querySelectorAll('a'));
    const mpLink = links.find(a => {
      const href = a.getAttribute('href') || '';
      return href.includes('marktplaats.nl') && (href.includes('/a/') || href.includes('/v/') || href.includes('/l/'));
    });
    if (mpLink) {
      vehicleUrl = mpLink.getAttribute('href') || '';
    }
  }
  if (!vehicleUrl) {
    vehicleUrl = htmlBody.match(/https?:\/\/(?:www\.)?marktplaats\.nl\/[alv]\/[^\s<>"]+/i)?.[0] || 
                 htmlBody.match(/https?:\/\/link\.marktplaats\.nl\/[^\s<>"]+/i)?.[0] || '';
  }
  
  // Extract customer email
  let customerEmail = null;
  const emailMatch = body.match(/E-mailadres:\s*([^\s<>]+@[^\s<>]+)/i);
  if (emailMatch) customerEmail = emailMatch[1].trim();
  
  return { cleanMessage, vehicleUrl, customerEmail };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting lead reprocessing...');

    // Fetch all email_messages with their HTML bodies
    const { data: messages, error: fetchError } = await supabaseClient
      .from('email_messages')
      .select('id, body, html_body, parsed_data, portal_source, lead_id, sender')
      .order('received_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch messages: ${fetchError.message}`);
    }

    console.log(`📧 Found ${messages?.length || 0} email messages to process`);

    let updated = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const msg of messages || []) {
      try {
        const source = msg.portal_source || 
                      (msg.sender?.toLowerCase().includes('autotrack') ? 'AutoTrack' : 
                       msg.sender?.toLowerCase().includes('autoscout24') ? 'AutoScout24' :
                       msg.sender?.toLowerCase().includes('marktplaats') ? 'Marktplaats' : 'Unknown');

        let cleanMessage = null;
        let vehicleUrl = null;
        let customerEmail = null;

        // Extract based on source
        if (source === 'AutoTrack') {
          const data = extractAutoTrackData(msg.body || '', msg.html_body || '');
          cleanMessage = data.cleanMessage;
          vehicleUrl = data.vehicleUrl;
          customerEmail = data.customerEmail;
        } else if (source === 'AutoScout24') {
          const data = extractAutoScout24Data(msg.body || '', msg.html_body || '');
          cleanMessage = data.cleanMessage;
          vehicleUrl = data.vehicleUrl;
          customerEmail = data.customerEmail;
        } else if (source === 'Marktplaats') {
          const data = extractMarktplaatsData(msg.body || '', msg.html_body || '');
          cleanMessage = data.cleanMessage;
          vehicleUrl = data.vehicleUrl;
          customerEmail = data.customerEmail;
        }

        // Only update if we found new data
        if (cleanMessage || vehicleUrl || customerEmail) {
          const updatedParsedData = {
            ...(msg.parsed_data || {}),
            cleanMessage: cleanMessage || msg.parsed_data?.cleanMessage,
            vehicleUrl: vehicleUrl || msg.parsed_data?.vehicleUrl,
            email: customerEmail || msg.parsed_data?.email
          };

          const { error: updateError } = await supabaseClient
            .from('email_messages')
            .update({ parsed_data: updatedParsedData })
            .eq('id', msg.id);

          if (updateError) {
            console.error(`❌ Failed to update message ${msg.id}:`, updateError);
            results.push({ id: msg.id, status: 'error', error: updateError.message });
          } else {
            updated++;
            results.push({ 
              id: msg.id, 
              status: 'updated',
              source,
              hasMessage: !!cleanMessage,
              hasUrl: !!vehicleUrl,
              hasEmail: !!customerEmail
            });
            console.log(`✅ Updated ${source} message ${msg.id}`);
          }
        } else {
          skipped++;
          results.push({ id: msg.id, status: 'skipped', source });
        }
      } catch (error) {
        console.error(`❌ Error processing message ${msg.id}:`, error);
        results.push({ id: msg.id, status: 'error', error: error.message });
      }
    }

    console.log(`\n📊 Reprocessing complete:
    ✅ Updated: ${updated}
    ⏭️  Skipped: ${skipped}
    📧 Total: ${messages?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: messages?.length || 0,
        updated,
        skipped,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Reprocessing Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
