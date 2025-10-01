import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const serviceAccount = JSON.parse(serviceAccountKey);

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
        `Subject: ${subject}`,
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

      // Base64url encode the MIME message
      const encodedMessage = btoa(mimeMessage)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

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

// Get access token with retry logic
async function getAccessTokenWithRetry(
  serviceAccount: any,
  impersonateEmail: string,
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const token = await getServiceAccountToken(serviceAccount, impersonateEmail);
      return token;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Token attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to get access token');
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
      console.error(`Send attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to send email');
}

// Get service account access token (reused from google-service-auth)
async function getServiceAccountToken(
  serviceAccount: any,
  impersonateEmail: string
): Promise<string> {
  const scope = 'https://www.googleapis.com/auth/gmail.send';
  
  const jwtAssertion = await createJWTAssertion(
    serviceAccount.client_email,
    serviceAccount.private_key,
    scope,
    impersonateEmail
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtAssertion,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Create JWT assertion for service account
async function createJWTAssertion(
  clientEmail: string,
  privateKey: string,
  scope: string,
  impersonateEmail: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: clientEmail,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
    sub: impersonateEmail,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Import the private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the JWT
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${signatureInput}.${encodedSignature}`;
}

// Base64 URL encode helper
function base64UrlEncode(str: string): string {
  const base64 = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
