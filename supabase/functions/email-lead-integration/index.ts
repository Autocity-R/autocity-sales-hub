
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailWebhookData {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const emailData: EmailWebhookData = await req.json();
    
    console.log('📧 Incoming email for lead integration:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      messageId: emailData.messageId
    });

    // Only process emails to verkoop@auto-city.nl
    if (!emailData.to.includes('verkoop@auto-city.nl')) {
      console.log('❌ Email not for verkoop@auto-city.nl, ignoring');
      return new Response(JSON.stringify({ success: false, message: 'Not for verkoop email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter out non-portal emails (spam, newsletters, etc.)
    if (!isValidPortalEmail(emailData)) {
      console.log('❌ Email not from recognized portal, ignoring');
      return new Response(JSON.stringify({ success: false, message: 'Not from recognized portal' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if lead exists
    let leadId = await findOrCreateLead(supabaseClient, emailData);
    
    // Handle email thread
    let threadId = await handleEmailThread(supabaseClient, emailData, leadId);
    
    // Store email message
    await storeEmailMessage(supabaseClient, emailData, threadId, leadId);
    
    // Update lead engagement
    await updateLeadEngagement(supabaseClient, leadId);

    console.log('✅ Email processed successfully for lead:', leadId);

    return new Response(JSON.stringify({
      success: true,
      leadId,
      threadId,
      message: 'Email processed and lead updated'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Email Lead Integration Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function findOrCreateLead(supabase: any, emailData: EmailWebhookData): Promise<string> {
  // Check if lead exists by email
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .eq('email', emailData.from)
    .single();

  if (existingLead) {
    return existingLead.id;
  }

  // Create new lead
  const nameParts = extractNameFromEmail(emailData.from, emailData.subject);
  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      email: emailData.from,
      first_name: nameParts.firstName,
      last_name: nameParts.lastName,
      status: 'new',
      priority: 'medium',
      source_email: emailData.from,
      intent_classification: classifyIntent(emailData.subject, emailData.text),
      urgency_level: classifyUrgency(emailData.subject, emailData.text)
    })
    .select('id')
    .single();

  if (error) throw error;
  return newLead.id;
}

async function handleEmailThread(supabase: any, emailData: EmailWebhookData, leadId: string): Promise<string> {
  // Check if thread exists
  const threadIdentifier = emailData.threadId || generateThreadId(emailData.subject);
  
  const { data: existingThread } = await supabase
    .from('email_threads')
    .select('id')
    .eq('thread_id', threadIdentifier)
    .eq('lead_id', leadId)
    .single();

  if (existingThread) {
    return existingThread.id;
  }

  // Create new thread
  const { data: newThread, error } = await supabase
    .from('email_threads')
    .insert({
      lead_id: leadId,
      thread_id: threadIdentifier,
      subject: emailData.subject,
      from_email: emailData.from,
      to_email: emailData.to,
      status: 'active'
    })
    .select('id')
    .single();

  if (error) throw error;
  return newThread.id;
}

async function storeEmailMessage(supabase: any, emailData: EmailWebhookData, threadId: string, leadId: string) {
  await supabase
    .from('email_messages')
    .insert({
      thread_id: threadId,
      lead_id: leadId,
      message_id: emailData.messageId,
      from_email: emailData.from,
      to_email: emailData.to,
      subject: emailData.subject,
      content: emailData.text,
      html_content: emailData.html,
      direction: 'inbound',
      status: 'received'
    });
}

async function updateLeadEngagement(supabase: any, leadId: string) {
  // Update lead with latest email activity
  await supabase
    .from('leads')
    .update({
      last_email_date: new Date().toISOString(),
      email_engagement_score: supabase.rpc('increment_engagement_score', { lead_id: leadId }),
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId);
}

function extractNameFromEmail(email: string, subject: string): { firstName: string; lastName: string } {
  // Try to extract name from email or subject
  const emailParts = email.split('@')[0].split('.');
  const firstName = emailParts[0]?.charAt(0).toUpperCase() + emailParts[0]?.slice(1) || '';
  const lastName = emailParts[1]?.charAt(0).toUpperCase() + emailParts[1]?.slice(1) || '';
  
  return { firstName, lastName };
}

function classifyIntent(subject: string, content: string): string {
  const text = (subject + ' ' + content).toLowerCase();
  
  if (text.includes('koop') || text.includes('interesse') || text.includes('aankoop')) return 'purchase_intent';
  if (text.includes('informatie') || text.includes('vraag') || text.includes('details')) return 'information_request';
  if (text.includes('afspraak') || text.includes('bezichtigen') || text.includes('kijken')) return 'appointment_request';
  if (text.includes('prijs') || text.includes('kosten') || text.includes('financiering')) return 'pricing_inquiry';
  
  return 'general_inquiry';
}

function classifyUrgency(subject: string, content: string): string {
  const text = (subject + ' ' + content).toLowerCase();
  
  if (text.includes('dringend') || text.includes('snel') || text.includes('urgent')) return 'high';
  if (text.includes('vandaag') || text.includes('morgen') || text.includes('asap')) return 'high';
  if (text.includes('week') || text.includes('maand')) return 'low';
  
  return 'medium';
}

function generateThreadId(subject: string): string {
  return subject.replace(/^(re:|fwd:)/i, '').trim().replace(/\s+/g, '_').toLowerCase();
}

function isValidPortalEmail(emailData: EmailWebhookData): boolean {
  const fromLower = emailData.from.toLowerCase();
  const subjectLower = emailData.subject.toLowerCase();
  const textLower = emailData.text.toLowerCase();
  
  // List of recognized auto portals
  const validPortalDomains = [
    'autotrack.nl',
    'marktplaats.nl',
    'autoscout24.nl',
    'occasions.nl',
    'gaspedaal.nl',
    'autowereld.nl',
    'autoweek.nl',
    'autonetwerk.nl',
    'autotrader.nl'
  ];
  
  // Check if email is from a recognized portal
  const isFromPortal = validPortalDomains.some(domain => fromLower.includes(domain));
  
  // Keywords that indicate a valid lead from portals
  const validLeadKeywords = [
    'interesse',
    'informatie',
    'voertuig',
    'auto',
    'vraag',
    'beschikbaar',
    'prijs',
    'afspraak',
    'bezichtigen',
    'kopen',
    'aankoop',
    'testrit'
  ];
  
  // Keywords that indicate spam or unwanted emails
  const spamKeywords = [
    'unsubscribe',
    'newsletter',
    'marketing',
    'advertentie',
    'promotie',
    'casino',
    'viagra',
    'gewonnen',
    'gratis',
    'klik hier'
  ];
  
  // Check for spam keywords
  const containsSpam = spamKeywords.some(keyword => 
    subjectLower.includes(keyword) || textLower.includes(keyword)
  );
  
  if (containsSpam) {
    console.log('🚫 Email contains spam keywords');
    return false;
  }
  
  // If from portal, accept it
  if (isFromPortal) {
    console.log('✅ Email from recognized portal');
    return true;
  }
  
  // If not from portal, check if it contains valid lead keywords
  const containsValidKeywords = validLeadKeywords.some(keyword => 
    subjectLower.includes(keyword) || textLower.includes(keyword)
  );
  
  if (containsValidKeywords) {
    console.log('✅ Email contains valid lead keywords');
    return true;
  }
  
  console.log('❌ Email does not meet lead criteria');
  return false;
}
