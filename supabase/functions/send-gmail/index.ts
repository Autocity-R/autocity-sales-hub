import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface EmailRequest {
  senderEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  attachments?: Array<{
    filename: string;
    url: string;
  }>;
  metadata?: {
    vehicleId?: string;
    templateId?: string;
  };
}

// === MANUS' OPLOSSING: UTF-8 SAFE BASE64URL ENCODING ===
function base64urlEncode(str: string): string {
  // Stap 1: Converteer de UTF-8 string naar een Uint8Array (een array van bytes)
  const bytes = new TextEncoder().encode(str);
  
  // Stap 2: Converteer de bytes naar een Base64 string
  // btoa kan niet direct met een Uint8Array overweg, dus we converteren de byte-waarden
  // terug naar karakters. Dit is een standaard en veilige methode.
  const base64 = btoa(String.fromCharCode(...bytes));
  
  // Stap 3: Converteer de standaard Base64 naar Base64URL formaat voor de Gmail API
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      senderEmail,
      to,
      cc = [],
      subject,
      htmlBody,
      attachments = [],
      metadata = {}
    }: EmailRequest = await req.json();

    console.log('📧 Gmail Send Request:', {
      senderEmail,
      to,
      cc,
      subject,
      attachmentCount: attachments.length
    });

    // Get service account key
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

      // Download attachments and convert to base64
      const attachmentData = await Promise.all(
        attachments.map(async (att) => {
          try {
            const response = await fetch(att.url);
            if (!response.ok) {
              console.warn(`Failed to download attachment: ${att.filename}`);
              return null;
            }
            const buffer = await response.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            return {
              filename: att.filename,
              mimeType: response.headers.get('content-type') || 'application/octet-stream',
              data: base64
            };
          } catch (error) {
            console.error(`Error downloading attachment ${att.filename}:`, error);
            return null;
          }
        })
      );

      const validAttachments = attachmentData.filter(att => att !== null);

      // Build MIME message
      const boundary = `boundary_${Date.now()}`;
      let mimeMessage = [
        `From: ${senderEmail}`,
        `To: ${to.join(', ')}`,
        cc.length > 0 ? `Cc: ${cc.join(', ')}` : null,
        `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        htmlBody,
        ''
      ].filter(line => line !== null).join('\r\n');

      // Add attachments
      for (const att of validAttachments) {
        mimeMessage += [
          `--${boundary}`,
          `Content-Type: ${att.mimeType}; name="${att.filename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${att.filename}"`,
          '',
          att.data,
          ''
        ].join('\r\n');
      }

      mimeMessage += `--${boundary}--`;

      // Base64url encode the MIME message - MANUS' UTF-8 SAFE ENCODING
      const encodedMessage = base64urlEncode(mimeMessage);

      // Send email via Gmail API with retry
      const sendResult = await sendEmailWithRetry(accessToken, senderEmail, encodedMessage);
      
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

// === MANUS' OPLOSSING: JWT CREATIE MET KID HEADER ===
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
      kid: serviceAccount.private_key_id, // <-- DE CRUCIALE TOEVOEGING!
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
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
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
        throw new Error(`Gmail API error (${response.status}): ${errorData}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Send attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to send email after retries');
}
