import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface EmailAttachment {
  filename: string;
  url?: string;
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

// JWT and Access Token functions (from send-gmail)
async function createJWTAssertion(serviceAccount: ServiceAccount): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: serviceAccount.private_key_id,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/gmail.send",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(
      `-----BEGIN PRIVATE KEY-----\n${privateKey.split("\n").filter(line => !line.includes("BEGIN") && !line.includes("END")).join("\n")}\n-----END PRIVATE KEY-----`
    ),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${unsignedToken}.${encodedSignature}`;
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const jwt = await createJWTAssertion(serviceAccount);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function sendEmailViaGmail(payload: EmailPayload, accessToken: string): Promise<void> {
  console.log(`📤 Sending email to ${payload.to[0]}...`);

  // Process attachments
  const processedAttachments = [];
  for (const att of (payload.attachments || [])) {
    try {
      let base64Data: string;
      if (att.base64Content) {
        base64Data = att.base64Content;
      } else if (att.url) {
        const response = await fetch(att.url);
        if (!response.ok) throw new Error(`Failed to fetch attachment: ${att.filename}`);
        const buffer = await response.arrayBuffer();
        base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      } else {
        continue;
      }
      processedAttachments.push({ filename: att.filename, content: base64Data });
    } catch (error) {
      console.error(`Failed to process attachment ${att.filename}:`, error);
    }
  }

  // Build MIME message
  const boundary = `boundary_${Date.now()}`;
  let message = [
    `From: ${payload.senderEmail}`,
    `To: ${payload.to.join(', ')}`,
  ];

  if (payload.cc && payload.cc.length > 0) {
    message.push(`Cc: ${payload.cc.join(', ')}`);
  }

  message.push(
    `Subject: ${payload.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    payload.htmlBody,
    ''
  );

  for (const att of processedAttachments) {
    message.push(
      `--${boundary}`,
      `Content-Type: application/octet-stream; name="${att.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename}"`,
      '',
      att.content,
      ''
    );
  }

  message.push(`--${boundary}--`);

  const rawMessage = message.join('\r\n');
  const encodedMessage = btoa(rawMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

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

    // Get access token
    console.log('🔑 Getting Gmail API access token...');
    const accessToken = await getAccessToken(serviceAccount);

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
        await supabase
          .from('email_queue')
          .update({
            status: 'processing',
            attempts: (task.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        // Send email
        await sendEmailViaGmail(task.payload, accessToken);

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
