import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import {
  base64UrlEncodeMimeMessage,
  buildGmailMimeMessage,
  loadAutocityLogoBase64,
  normalizeHtmlForInlineLogo,
  PreparedEmailAttachment,
  wrapBase64,
} from '../_shared/emailMime.ts';

interface EmailAttachment {
  filename: string;
  mimeType?: string;
  url?: string;
  base64?: string;
  content?: string;
  base64Content?: string;
}

interface EmailPayload {
  senderEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  attachments?: EmailAttachment[];
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id: string;
}

// JWT and Access Token functions using jose library
// Token cache per sender email for the duration of this invocation
const tokenCache: Record<string, string> = {};

async function createJWTAssertion(serviceAccount: ServiceAccount, senderEmail: string): Promise<string> {
  const userToImpersonate = senderEmail;
  const scopes = 'https://www.googleapis.com/auth/gmail.send';

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

async function getAccessToken(serviceAccount: ServiceAccount, senderEmail: string): Promise<string> {
  const jwt = await createJWTAssertion(serviceAccount, senderEmail);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gmail Auth Failed (${response.status}): ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  console.log(`✅ Gmail authentication successful for ${senderEmail}`);
  return data.access_token;
}

async function getAccessTokenForSender(serviceAccount: ServiceAccount, senderEmail: string): Promise<string> {
  if (tokenCache[senderEmail]) return tokenCache[senderEmail];
  const token = await getAccessToken(serviceAccount, senderEmail);
  tokenCache[senderEmail] = token;
  return token;
}

async function sendEmailViaGmail(payload: EmailPayload, accessToken: string, supabase: ReturnType<typeof createClient>): Promise<void> {
  console.log(`📤 Sending email to ${payload.to[0]}...`);

  // Process attachments
  const processedAttachments: PreparedEmailAttachment[] = [];
  for (const att of (payload.attachments || [])) {
    try {
      let base64Data: string;
      let mimeType = att.mimeType || 'application/octet-stream';
      if (att.base64Content || att.base64 || att.content) {
        base64Data = att.base64Content || att.base64 || att.content || '';
      } else if (att.url) {
        const response = await fetch(att.url);
        if (!response.ok) throw new Error(`Failed to fetch attachment: ${att.filename}`);
        mimeType = response.headers.get('content-type') || mimeType;
        const buffer = await response.arrayBuffer();
        base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      } else {
        continue;
      }
      processedAttachments.push({ filename: att.filename, mimeType, data: wrapBase64(base64Data) });
    } catch (error) {
      console.error(`Failed to process attachment ${att.filename}:`, error);
    }
  }

  const normalized = normalizeHtmlForInlineLogo(payload.htmlBody);
  const inlineLogoBase64 = normalized.shouldAttachLogo
    ? await loadAutocityLogoBase64(supabase)
    : undefined;

  if (inlineLogoBase64) {
    console.log('📎 Inline Autocity logo attached via CID');
  }

  const rawMessage = buildGmailMimeMessage({
    senderEmail: payload.senderEmail,
    to: payload.to,
    cc: payload.cc,
    subject: payload.subject,
    htmlBody: normalized.htmlBody,
    attachments: processedAttachments,
    inlineLogoBase64,
  });
  const encodedMessage = base64UrlEncodeMimeMessage(rawMessage);

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gmail API error (${response.status}): ${JSON.stringify(errorData)}`);
  }

  console.log('✅ Email sent successfully');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate CRON_SECRET for scheduled function calls
  const cronSecret = Deno.env.get('CRON_SECRET');
  const requestSecret = req.headers.get('x-cron-secret');
  
  if (cronSecret && requestSecret !== cronSecret) {
    console.error('Invalid or missing CRON_SECRET');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get service account credentials
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);

    console.log('🔑 Gmail API ready — tokens will be fetched per sender...');

    // Fetch pending or retry-ready emails from queue
    const { data: tasks, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .or('status.eq.pending,and(status.eq.retry,retry_after.lte.now())')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) throw fetchError;

    if (!tasks || tasks.length === 0) {
      console.log('📭 No pending emails in queue');
      return new Response(JSON.stringify({ message: 'No emails to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`📬 Processing ${tasks.length} email(s) from queue...`);
    let processedCount = 0;
    let failedCount = 0;

    for (const task of tasks) {
      try {
        // Mark as processing
        const claimQuery = supabase
          .from('email_queue')
          .update({
            status: 'processing',
            attempts: (task.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        if (task.status === 'retry') {
          claimQuery.eq('status', 'retry').lte('retry_after', new Date().toISOString());
        } else {
          claimQuery.eq('status', 'pending');
        }

        const { data: claimedRows, error: claimError } = await claimQuery.select('id');
        if (claimError) throw claimError;
        if (!claimedRows || claimedRows.length === 0) {
          console.log(`⏭️ Task ${task.id} was already claimed by another queue worker — skipping`);
          continue;
        }

        // Get access token for the sender (dynamic impersonation with fallback)
        const senderEmail = task.payload.senderEmail ?? 'inkoop@auto-city.nl';
        const accessToken = await getAccessTokenForSender(serviceAccount, senderEmail);

        // Send email
        await sendEmailViaGmail(task.payload, accessToken, supabase);

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({ status: 'sent' })
          .eq('id', task.id);

        // Log to email_logs
        await supabase.from('email_logs').insert({
          sender_email: task.payload.senderEmail,
          recipient_email: task.payload.to[0],
          cc_emails: task.payload.cc || [],
          subject: task.payload.subject,
          status: 'sent',
          attachment_count: task.payload.attachments?.length || 0,
          vehicle_id: task.vehicle_id,
          template_id: task.template_id,
        });

        processedCount++;
        console.log(`✅ Task ${task.id} sent successfully`);

      } catch (error) {
        console.error(`❌ Failed to send task ${task.id}:`, error.message);
        failedCount++;

        // Check for rate limit error
        if (error.message.includes('429')) {
          const retryAfterMatch = error.message.match(/Retry after ([\d-:TZ.]+)/);
          const retryAfter = retryAfterMatch 
            ? retryAfterMatch[1]
            : new Date(Date.now() + 5 * 60000).toISOString();

          await supabase
            .from('email_queue')
            .update({
              status: 'retry',
              retry_after: retryAfter,
              error_message: `Rate limited. Will retry after ${retryAfter}`,
            })
            .eq('id', task.id);

          console.log(`⏰ Rate limit hit. Stopping processing. Next retry: ${retryAfter}`);
          break;
        } else {
          // Other error - mark as failed after 3 attempts
          const newStatus = task.attempts >= 2 ? 'failed' : 'retry';
          const retryAfter = newStatus === 'retry' 
            ? new Date(Date.now() + 2 * 60000).toISOString() 
            : null;

          await supabase
            .from('email_queue')
            .update({
              status: newStatus,
              retry_after: retryAfter,
              error_message: error.message,
            })
            .eq('id', task.id);
        }
      }
    }

    return new Response(JSON.stringify({
      message: 'Queue processing complete',
      processed: processedCount,
      failed: failedCount,
      total: tasks.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Queue processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
