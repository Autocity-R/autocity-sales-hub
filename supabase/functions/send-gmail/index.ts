import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";
import { corsHeaders } from '../_shared/cors.ts';
import {
  base64UrlEncodeMimeMessage,
  buildGmailMimeMessage,
  loadAutocityLogoBase64,
  normalizeHtmlForInlineLogo,
  PreparedEmailAttachment,
  wrapBase64,
} from '../_shared/emailMime.ts';

// --- INTERFACES (AANGEPAST VOOR OPTIONELE BASE64) ---
interface EmailAttachment {
  filename: string;
  mimeType?: string;
  url?: string;
  base64?: string;
  base64Content?: string;
  content?: string;
}

interface EmailRequest {
  senderEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  attachments?: EmailAttachment[];
  metadata?: {
    vehicleId?: string;
    templateId?: string;
    leadId?: string;
    threadId?: string;
    replyToMessageId?: string;
  };
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// --- MAIN SERVER LOGIC ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // For JWT-authenticated requests, allow them through
  // For scheduled/automated requests, validate CRON_SECRET
  const authHeader = req.headers.get('Authorization');
  const hasJWT = authHeader && authHeader.startsWith('Bearer ');
  
  if (!hasJWT) {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const requestSecret = req.headers.get('x-cron-secret');
    
    if (cronSecret && requestSecret !== cronSecret) {
      console.error('Invalid or missing authentication');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const requestBody = await req.json();
    
    // Normalize 'to' to always be an array (handle both string and array inputs)
    const toArray = Array.isArray(requestBody.to) 
      ? requestBody.to 
      : [requestBody.to];
    
    // Normalize sender email (handle both 'senderEmail' and 'from' field names)
    const senderEmail = requestBody.senderEmail || requestBody.from;
    
    if (!senderEmail) {
      throw new Error('Missing sender email: provide either "senderEmail" or "from" field');
    }
    
    const {
      cc = [],
      subject,
      htmlBody,
      body, // Fallback for plain text body
      attachments = [],
      metadata = {}
    } = requestBody;
    
    const to = toArray as string[];
    const emailBody = htmlBody || body || '';

    console.log(`📧 Processing email request for "${to.join(', ')}" with subject "${subject}" and ${attachments.length} attachment(s) in request.`);

    // --- 1. AUTHENTICATIE ---
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    
    console.log('🔑 Service Account Info:', {
      client_email: serviceAccount.client_email,
      private_key_id: serviceAccount.private_key_id?.substring(0, 8) + '...',
    });

    // Get auth header from request
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Auth error:', userError);
    }

    let gmailMessageId: string | null = null;
    let status = 'failed';
    let errorMessage: string | null = null;
    const startTime = Date.now();

    try {
      // Get access token with retry logic
      const accessToken = await getAccessTokenWithRetry(serviceAccount, senderEmail);

      // --- 2. BIJLAGEN VERWERKEN (VOLLEDIG VERNIEUWD) ---
      const validAttachments: PreparedEmailAttachment[] = [];
      for (const att of attachments) {
        try {
          let base64Data: string;
          let mimeType = att.mimeType || 'application/octet-stream';

          if (att.base64 || att.base64Content || att.content) {
            console.log(`✅ Using provided base64 data for attachment: ${att.filename}`);
            // Sanitize: remove any existing line breaks for consistent formatting
            base64Data = (att.base64 || att.base64Content || att.content || '').replace(/\r?\n/g, '');
          } else if (att.url) {
            console.log(`📥 Fetching attachment from URL: ${att.filename}`);
            const response = await fetch(att.url);

            // Verbeterde logging
            console.log('📊 Attachment fetch details:', {
              filename: att.filename,
              status: response.status,
              ok: response.ok,
              contentType: response.headers.get('content-type'),
              contentLength: response.headers.get('content-length'),
            });

            if (!response.ok) {
              throw new Error(`Failed to download attachment. Status: ${response.status}`);
            }

            mimeType = response.headers.get('content-type') || mimeType;
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            console.log(`📏 Converting ${bytes.length} bytes to base64 for ${att.filename}`);
            base64Data = encodeBase64(bytes);
            console.log(`✅ Base64 conversion complete: ${base64Data.length} characters`);
          } else {
            throw new Error(`Attachment "${att.filename}" has no url or base64 data.`);
          }

          validAttachments.push({
            filename: att.filename,
            mimeType: mimeType,
            data: wrapBase64(base64Data),
          });

        } catch (error) {
          console.error(`❌ Failed to process attachment "${att.filename}":`, error.message);
          // Ga door naar de volgende bijlage, maar log de fout
        }
      }

      console.log(`✅ Successfully processed ${validAttachments.length} out of ${attachments.length} attachments.`);

      // Verbeterde foutafhandeling: gooi een error als de bedoeling was een bijlage te sturen, maar geen enkele is gelukt
      if (attachments.length > 0 && validAttachments.length === 0) {
        throw new Error('All attachment downloads or processing failed. Halting email send.');
      }

      // --- 3. MIME MESSAGE BOUWEN ---
      const normalized = normalizeHtmlForInlineLogo(emailBody);
      let inlineLogoBase64: string | undefined;
      if (normalized.shouldAttachLogo) {
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceRoleKey) {
          throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured; cannot attach inline Autocity logo');
        }

        const storageSupabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          serviceRoleKey,
          { auth: { persistSession: false } },
        );
        inlineLogoBase64 = await loadAutocityLogoBase64(storageSupabase);
        console.log('📎 Inline Autocity logo attached via CID');
      }

      const mimeMessage = buildGmailMimeMessage({
        senderEmail,
        to,
        cc,
        subject,
        htmlBody: normalized.htmlBody,
        attachments: validAttachments,
        inlineLogoBase64,
        replyToMessageId: metadata.replyToMessageId,
      });

      // --- 4. VERSTUREN VIA GMAIL API ---
      const base64EncodedEmail = base64UrlEncodeMimeMessage(mimeMessage);

      const sendResult = await sendEmailWithRetry(accessToken, senderEmail, base64EncodedEmail);
      
      gmailMessageId = sendResult.id;
      status = 'sent';
      
      console.log('✅ Email sent successfully:', gmailMessageId);

    } catch (error) {
      console.error('❌ Email send failed:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      status = 'failed';
    }

    // Log email to database
    const processingTime = Date.now() - startTime;
    
    try {
      // Log to email_logs table
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          vehicle_id: metadata.vehicleId || null,
          template_id: metadata.templateId || null,
          sender_email: senderEmail,
          recipient_email: to[0],
          cc_emails: cc,
          subject: subject,
          attachment_count: attachments.length,
          sent_by_user_id: user?.id || null,
          status: status,
          error_message: errorMessage,
          gmail_message_id: gmailMessageId
        });

      if (logError) {
        console.error('Failed to log email:', logError);
      }

      // If this is a lead email, also log to email_messages table
      if (metadata.leadId && status === 'sent') {
        const { error: messageError } = await supabase
          .from('email_messages')
          .insert({
            thread_id: metadata.threadId || null,
            lead_id: metadata.leadId,
            message_id: gmailMessageId || '',
            sender: senderEmail,
            recipient: to[0],
            subject: subject,
            body: emailBody,
            received_at: new Date().toISOString(),
            is_from_customer: false, // This is an outgoing email from us
            portal_source: 'crm'
          });

        if (messageError) {
          console.error('Failed to log to email_messages:', messageError);
        }
      }
    } catch (logError) {
      console.error('Exception while logging email:', logError);
    }

    if (status === 'failed') {
      return new Response(JSON.stringify({
        success: false,
        error: errorMessage
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: gmailMessageId,
      processingTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Send Gmail Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// --- JWT CREATIE MET KID HEADER ---
async function createJWTAssertion(
  serviceAccount: ServiceAccount,
  scope: string,
  impersonateEmail: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  console.log('🔐 Creating JWT with kid:', serviceAccount.private_key_id?.substring(0, 8) + '...');
  
  const privateKeyObject = await jose.importPKCS8(serviceAccount.private_key, 'RS256');

  const jwt = await new jose.SignJWT({ scope })
    .setProtectedHeader({
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id,
    })
    .setIssuedAt(now)
    .setIssuer(serviceAccount.client_email)
    .setSubject(impersonateEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime(now + 3600)
    .sign(privateKeyObject);

  return jwt;
}

// Get access token using the corrected JWT
async function getAccessToken(
  serviceAccount: ServiceAccount,
  impersonateEmail: string
): Promise<string> {
  const scope = 'https://www.googleapis.com/auth/gmail.send';
  const assertion = await createJWTAssertion(serviceAccount, scope, impersonateEmail);

  console.log('📤 Exchanging JWT for access token...');

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
  
  if (!response.ok) {
    console.error('❌ Token exchange failed:', JSON.stringify(data, null, 2));
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }

  console.log('✅ Access token obtained successfully');
  return data.access_token;
}

// Get access token with retry logic
async function getAccessTokenWithRetry(
  serviceAccount: ServiceAccount,
  impersonateEmail: string,
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const token = await getAccessToken(serviceAccount, impersonateEmail);
      return token;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Token attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to get access token after retries');
}

// Send email with retry logic
async function sendEmailWithRetry(
  accessToken: string,
  senderEmail: string,
  encodedMessage: string,
  maxRetries = 3
): Promise<{ id: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/${senderEmail}/messages/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: encodedMessage
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        
        // Parse rate limit retry time if available
        if (response.status === 429) {
          try {
            const errorJson = JSON.parse(errorData);
            const retryAfter = errorJson?.error?.message?.match(/Retry after (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/)?.[1];
            if (retryAfter) {
              console.error(`⏰ Rate limit exceeded. Retry after: ${retryAfter}`);
            }
          } catch (e) {
            // Failed to parse, continue with regular error
          }
        }
        
        throw new Error(`Gmail API error (${response.status}): ${errorData}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Send attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to send email after retries');
}
