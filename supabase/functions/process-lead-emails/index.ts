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

// Gmail API authentication with jose library
async function createJWTAssertion(serviceAccount: ServiceAccount): Promise<string> {
  const userToImpersonate = 'verkoop@auto-city.nl';
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
  ].join(' ');

  // jose library handles PEM->DER conversion automatically
  const privateKey = await jose.importPKCS8(
    serviceAccount.private_key.replace(/\\n/g, '\n'), 
    'RS256'
  );
  
  const jwt = await new jose.SignJWT({ scope: scopes })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: serviceAccount.private_key_id })
    .setIssuedAt()
    .setIssuer(serviceAccount.client_email)
    .setSubject(userToImpersonate)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime('1h')
    .sign(privateKey);

  return jwt;
}

async function getAccessToken(serviceAccount: ServiceAccount, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const jwt = await createJWTAssertion(serviceAccount);
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gmail Auth Failed (${response.status}): ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new Error('No access token in response');
      }
      
      console.log('✅ Gmail authentication successful');
      return data.access_token;
    } catch (error) {
      console.error(`❌ Access token attempt ${attempt}/${retries}:`, error.message);
      
      if (attempt === retries) {
        throw new Error(`Failed to get access token after ${retries} attempts: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  
  throw new Error('Failed to get access token');
}

// Helper function for Gmail API calls with retry logic
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      console.error(`❌ Fetch attempt ${attempt}/${retries}:`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  
  throw new Error('Fetch failed after all retries');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: [] as Array<{ id: string; error: string }>
  };

  try {
    console.log('🚀 Starting lead email processing...');
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    
    console.log('🔑 Getting Gmail API access token...');
    const accessToken = await getAccessToken(serviceAccount);

    // Search for unread lead emails
    const query = 'is:unread to:verkoop@auto-city.nl (from:autotrack.nl OR from:marktplaats.nl OR from:autoscout24.nl OR from:autoscout24.com OR from:2dehands.be OR subject:"interesse" OR subject:"vraag" OR subject:"contactverzoek")';
    
    console.log('🔍 Searching for lead emails...');
    const searchResponse = await fetchWithRetry(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Gmail search failed (${searchResponse.status}): ${errorText}`);
    }

    const searchData = await searchResponse.json();
    const messages = searchData.messages || [];
    
    console.log(`📬 Found ${messages.length} potential lead emails`);

    for (const message of messages) {
      try {
        // Get full message details with retry
        const messageResponse = await fetchWithRetry(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!messageResponse.ok) {
          const errorText = await messageResponse.text();
          throw new Error(`Failed to fetch message (${messageResponse.status}): ${errorText}`);
        }

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
          const errorMsg = `Could not parse lead data from ${from}`;
          console.log(`⚠️  ${errorMsg}`);
          stats.errors.push({ id: message.id, error: errorMsg });
          continue;
        }

        console.log('✅ Successfully parsed lead data:', parsedData.email);

        // Check if thread already exists
        const { data: existingThread, error: threadCheckError } = await supabase
          .from('email_threads')
          .select('id, lead_id')
          .eq('thread_id', threadId)
          .maybeSingle();

        if (threadCheckError) {
          throw new Error(`Database error checking thread: ${threadCheckError.message}`);
        }

        let leadId: string;
        let threadDbId: string;

        if (existingThread) {
          // Thread exists, use existing lead
          leadId = existingThread.lead_id;
          threadDbId = existingThread.id;
          
          console.log(`📌 Existing thread found, using lead: ${leadId}`);

          // Update thread stats
          const { error: updateError } = await supabase
            .from('email_threads')
            .update({
              last_message_date: internalDate,
              message_count: supabase.rpc('increment', { x: 1 }),
              updated_at: new Date().toISOString()
            })
            .eq('id', threadDbId);

          if (updateError) {
            throw new Error(`Failed to update thread: ${updateError.message}`);
          }
          
          stats.updated++;
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

          if (leadError) {
            throw new Error(`Failed to create lead: ${leadError.message}`);
          }
          
          if (!newLead) {
            throw new Error('Lead creation returned no data');
          }
          
          leadId = newLead.id;
          stats.created++;

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

          if (threadError) {
            throw new Error(`Failed to create thread: ${threadError.message}`);
          }
          
          if (!newThread) {
            throw new Error('Thread creation returned no data');
          }
          
          threadDbId = newThread.id;
        }

        // Store message
        const { error: messageError } = await supabase
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

        if (messageError) {
          throw new Error(`Failed to store message: ${messageError.message}`);
        }

        // Mark as read in Gmail with retry
        try {
          const markReadResponse = await fetchWithRetry(
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

          if (!markReadResponse.ok) {
            console.error(`⚠️ Could not mark email ${message.id} as read (${markReadResponse.status})`);
          }
        } catch (markError) {
          console.error(`⚠️ Failed to mark email as read:`, markError);
          // Don't fail the whole operation if we can't mark as read
        }

        stats.processed++;
        console.log(`✅ Email processed (${stats.processed}/${messages.length})`);

      } catch (error: any) {
        console.error(`❌ Error processing message ${message.id}:`, error);
        stats.errors.push({
          id: message.id,
          error: error.message || 'Unknown error'
        });
      }
    }

    console.log(`\n📊 Processing Summary:`);
    console.log(`   ✅ Processed: ${stats.processed}`);
    console.log(`   🆕 Created: ${stats.created}`);
    console.log(`   🔄 Updated: ${stats.updated}`);
    console.log(`   ❌ Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Error Details:');
      stats.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. Message ${err.id}: ${err.error}`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: stats.processed,
        created: stats.created,
        updated: stats.updated,
        errors: stats.errors.length,
        errorDetails: stats.errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Critical function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack,
        stats: stats
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
