
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailSendRequest {
  to: string;
  from: string;
  subject: string;
  content: string;
  leadId: string;
  vehicleId?: string;
  aiGenerated?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, from, subject, content, leadId, vehicleId, aiGenerated }: EmailSendRequest = await req.json();
    
    console.log('📧 Sending lead email:', {
      to,
      from,
      subject,
      leadId,
      aiGenerated
    });

    // Here you would integrate with your email service (e.g., Resend, SendGrid, etc.)
    // For now, we'll simulate successful email sending
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Email sent successfully to:', to);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
      emailId: `email_${Date.now()}`,
      to,
      subject
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Email Send Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
