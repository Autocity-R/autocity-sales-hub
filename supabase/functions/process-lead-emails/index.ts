import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

interface ParsedLeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  interestedVehicle?: string;
  source: string;
  notes: string;
}

// Portal parsers
function parseAutoTrack(body: string, subject: string): ParsedLeadData | null {
  console.log('📧 Parsing AutoTrack email');
  
  const nameMatch = body.match(/(?:Naam|Name):\s*([^\n]+)/i);
  const emailMatch = body.match(/(?:E-?mail):\s*([^\s\n]+)/i);
  const phoneMatch = body.match(/(?:Telefoon|Phone|Tel):\s*([^\n]+)/i);
  const vehicleMatch = body.match(/(?:Voertuig|Vehicle|Auto):\s*([^\n]+)/i) || 
                       subject.match(/(?:interesse in|interested in)\s+([^\n]+)/i);
  
  if (nameMatch && emailMatch) {
    const nameParts = nameMatch[1].trim().split(' ');
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || nameParts[0],
      email: emailMatch[1].trim(),
      phone: phoneMatch?.[1]?.trim(),
      interestedVehicle: vehicleMatch?.[1]?.trim(),
      source: 'autotrack',
      notes: `Lead van AutoTrack. ${vehicleMatch ? `Interesse in: ${vehicleMatch[1].trim()}` : ''}`
    };
  }
  return null;
}

function parseMarktplaats(body: string, subject: string): ParsedLeadData | null {
  console.log('📧 Parsing Marktplaats email');
  
  const nameMatch = body.match(/(?:Van|From):\s*([^\n]+)/i) || 
                    body.match(/(?:Naam|Name):\s*([^\n]+)/i);
  const emailMatch = body.match(/(?:Antwoord-e-mail|Reply email):\s*([^\s\n]+)/i) ||
                     body.match(/(?:E-?mail):\s*([^\s\n]+)/i);
  const phoneMatch = body.match(/(?:Telefoon|Phone):\s*([^\n]+)/i);
  const messageMatch = body.match(/(?:Bericht|Message):\s*([^\n]+(?:\n(?!(?:Van|Advertentie|Bekijk)).*)*)/i);
  const adMatch = body.match(/(?:Advertentie|Ad):\s*([^\n]+)/i);
  
  if (nameMatch && emailMatch) {
    const nameParts = nameMatch[1].trim().split(' ');
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || nameParts[0],
      email: emailMatch[1].trim(),
      phone: phoneMatch?.[1]?.trim(),
      interestedVehicle: adMatch?.[1]?.trim(),
      source: 'marktplaats',
      notes: `Lead van Marktplaats. ${messageMatch ? messageMatch[1].trim() : ''} ${adMatch ? `Voor advertentie: ${adMatch[1].trim()}` : ''}`
    };
  }
  return null;
}

function parseAutoScout24(body: string, subject: string): ParsedLeadData | null {
  console.log('📧 Parsing AutoScout24 email');
  
  const nameMatch = body.match(/(?:Name|Naam):\s*([^\n]+)/i);
  const emailMatch = body.match(/(?:E-?mail):\s*([^\s\n]+)/i);
  const phoneMatch = body.match(/(?:Telefoon|Phone|Tel\.?):\s*([^\n]+)/i);
  const vehicleMatch = body.match(/(?:Fahrzeug|Vehicle|Auto):\s*([^\n]+)/i) ||
                       subject.match(/(?:Interesse|Anfrage).*?:\s*(.+?)(?:\s*\||\s*-|$)/i);
  const messageMatch = body.match(/(?:Nachricht|Bericht|Message):\s*([^\n]+(?:\n(?!(?:Name|E-mail)).*)*)/i);
  
  if (nameMatch && emailMatch) {
    const nameParts = nameMatch[1].trim().split(' ');
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || nameParts[0],
      email: emailMatch[1].trim(),
      phone: phoneMatch?.[1]?.trim(),
      interestedVehicle: vehicleMatch?.[1]?.trim(),
      source: 'autoscout24',
      notes: `Lead van AutoScout24. ${messageMatch ? messageMatch[1].trim() : ''} ${vehicleMatch ? `Interesse in: ${vehicleMatch[1].trim()}` : ''}`
    };
  }
  return null;
}

function parseTweedehands(body: string, subject: string): ParsedLeadData | null {
  console.log('📧 Parsing 2dehands email');
  
  // 2dehands uses similar format to Marktplaats
  return parseMarktplaats(body, subject);
}

function parseGenericLead(body: string, subject: string): ParsedLeadData | null {
  console.log('📧 Parsing generic lead email');
  
  const emailMatch = body.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = body.match(/(?:\+31|0)[1-9](?:[0-9]\s?){8}/);
  const nameMatch = body.match(/(?:Naam|Name|Van|From):\s*([^\n]+)/i);
  
  if (emailMatch) {
    const nameParts = nameMatch?.[1]?.trim().split(' ') || ['Onbekend'];
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || '',
      email: emailMatch[1],
      phone: phoneMatch?.[0],
      source: 'website',
      notes: `Generieke lead. Onderwerp: ${subject}. ${body.substring(0, 200)}...`,
      interestedVehicle: undefined
    };
  }
  return null;
}

function parseLeadEmail(sender: string, subject: string, body: string): ParsedLeadData | null {
  // Determine portal based on sender
  const senderLower = sender.toLowerCase();
  
  if (senderLower.includes('autotrack')) {
    return parseAutoTrack(body, subject);
  } else if (senderLower.includes('marktplaats')) {
    return parseMarktplaats(body, subject);
  } else if (senderLower.includes('autoscout24') || senderLower.includes('autoscout')) {
    return parseAutoScout24(body, subject);
  } else if (senderLower.includes('2dehands') || senderLower.includes('tweedehands')) {
    return parseTweedehands(body, subject);
  } else {
    // Try generic parsing for other sources
    return parseGenericLead(body, subject);
  }
}

// Gmail API authentication
async function createJWTAssertion(serviceAccount: ServiceAccount): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: "verkoop@auto-city.nl", // Impersonate this email
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const message = `${encodedHeader}.${encodedPayload}`;
  
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const keyData = await crypto.subtle.importKey(
    "pkcs8",
    encoder.encode(privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyData,
    data
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${message}.${encodedSignature}`;
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const assertion = await createJWTAssertion(serviceAccount);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting lead email processing...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gmail access token
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    console.log('🔑 Getting Gmail API access token...');
    const accessToken = await getAccessToken(serviceAccount);

    // Search for unread lead emails
    const query = 'is:unread to:verkoop@auto-city.nl (from:autotrack.nl OR from:marktplaats.nl OR from:autoscout24.nl OR from:autoscout24.com OR from:2dehands.be OR subject:"interesse" OR subject:"vraag" OR subject:"contactverzoek")';
    
    console.log('🔍 Searching for lead emails...');
    const searchResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const searchData = await searchResponse.json();
    const messages = searchData.messages || [];
    
    console.log(`📬 Found ${messages.length} potential lead emails`);

    let processed = 0;
    let created = 0;
    let errors = 0;

    for (const message of messages) {
      try {
        // Get full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        const messageData = await messageResponse.json();
        const headers = messageData.payload.headers;
        
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
        const threadId = messageData.threadId;
        const messageId = messageData.id;
        const internalDate = new Date(parseInt(messageData.internalDate));

        // Get email body
        let body = '';
        if (messageData.payload.body.data) {
          body = atob(messageData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (messageData.payload.parts) {
          const textPart = messageData.payload.parts.find((p: any) => p.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }

        console.log(`\n📧 Processing: ${subject} from ${from}`);

        // Parse the email
        const parsedData = parseLeadEmail(from, subject, body);
        
        if (!parsedData) {
          console.log('⚠️  Could not parse lead data, skipping...');
          errors++;
          continue;
        }

        console.log('✅ Successfully parsed lead data:', parsedData.email);

        // Check if thread already exists
        const { data: existingThread } = await supabase
          .from('email_threads')
          .select('id, lead_id')
          .eq('thread_id', threadId)
          .single();

        let leadId: string;
        let threadDbId: string;

        if (existingThread) {
          // Thread exists, use existing lead
          leadId = existingThread.lead_id;
          threadDbId = existingThread.id;
          
          console.log(`📌 Existing thread found, using lead: ${leadId}`);

          // Update thread stats
          await supabase
            .from('email_threads')
            .update({
              last_message_date: internalDate,
              message_count: supabase.rpc('increment', { x: 1 }),
              updated_at: new Date().toISOString()
            })
            .eq('id', threadDbId);
        } else {
          // New thread, create lead
          console.log('🆕 Creating new lead...');
          
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              first_name: parsedData.firstName,
              last_name: parsedData.lastName,
              email: parsedData.email,
              phone: parsedData.phone,
              source_email: from,
              email_thread_id: threadId,
              intent_classification: 'informatie_aanvraag',
              urgency_level: 'medium',
              status: 'new',
              priority: 'medium',
              interested_vehicle: parsedData.interestedVehicle,
            })
            .select()
            .single();

          if (leadError) throw leadError;
          leadId = newLead.id;
          created++;

          console.log(`✅ Lead created: ${leadId}`);

          // Create thread record
          const { data: newThread, error: threadError } = await supabase
            .from('email_threads')
            .insert({
              thread_id: threadId,
              lead_id: leadId,
              subject: subject,
              participants: [from, 'verkoop@auto-city.nl'],
              first_message_date: internalDate,
              last_message_date: internalDate,
              message_count: 1
            })
            .select()
            .single();

          if (threadError) throw threadError;
          threadDbId = newThread.id;
        }

        // Store message
        await supabase
          .from('email_messages')
          .insert({
            thread_id: threadDbId,
            lead_id: leadId,
            message_id: messageId,
            sender: from,
            recipient: 'verkoop@auto-city.nl',
            subject: subject,
            body: body,
            received_at: internalDate,
            is_from_customer: true,
            portal_source: parsedData.source,
            parsed_data: parsedData
          });

        // Mark as read in Gmail
        await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}/modify`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              removeLabelIds: ['UNREAD']
            }),
          }
        );

        processed++;
        console.log(`✅ Email processed and marked as read`);

      } catch (error) {
        console.error('❌ Error processing message:', error);
        errors++;
      }
    }

    console.log(`\n📊 Summary: ${processed} processed, ${created} new leads, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        created,
        errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
