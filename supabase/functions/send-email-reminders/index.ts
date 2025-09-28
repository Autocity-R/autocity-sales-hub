import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VehicleReminder {
  vehicle_id: string;
  reminder_type: string;
  email_type: string;
  recipient_email: string;
  days_since_last_email: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting email reminder check...');

    // Get vehicles that need reminders
    const { data: reminders, error } = await supabase
      .rpc('get_vehicles_needing_reminders');

    if (error) {
      console.error('Error getting vehicles needing reminders:', error);
      throw error;
    }

    console.log(`Found ${reminders?.length || 0} vehicles needing reminders`);

    const sentReminders = [];
    const failedReminders = [];

    // Process each reminder
    for (const reminder of reminders || []) {
      try {
        // Get vehicle details with CMR files and supplier contact for email template
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select(`*, 
            customer_contact:contacts!customer_id(*),
            supplier_contact:contacts!supplier_id(*)
          `)
          .eq('id', reminder.vehicle_id)
          .single();

        // Get CMR files for papers reminders
        let cmrFiles = [];
        if (reminder.reminder_type === 'papers_reminder') {
          const { data: files } = await supabase
            .from('vehicle_files')
            .select('*')
            .eq('vehicle_id', reminder.vehicle_id)
            .eq('category', 'cmr');
          
          cmrFiles = files || [];
        }

        if (vehicleError || !vehicle) {
          console.error(`Vehicle not found: ${reminder.vehicle_id}`);
          continue;
        }

        // Generate email content based on reminder type
        const emailContent = generateEmailContent(reminder, vehicle, cmrFiles);
        
        // For now, just log what would be sent (email sending will be implemented later)
        console.log(`Would send email for vehicle ${reminder.vehicle_id}:`, {
          to: reminder.recipient_email,
          subject: emailContent.subject,
          reminder_type: reminder.reminder_type,
          attachments: reminder.reminder_type === 'papers_reminder' ? cmrFiles.length : 0
        });

        // Log the sent reminder
        await supabase.from('email_reminders').insert({
          vehicle_id: reminder.vehicle_id,
          reminder_type: reminder.reminder_type,
          email_type: reminder.email_type,
          recipient_email: reminder.recipient_email,
          status: 'sent',
          next_reminder_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next reminder in 7 days
        });

        sentReminders.push({
          vehicle_id: reminder.vehicle_id,
          email_type: reminder.email_type,
          recipient: reminder.recipient_email
        });

      } catch (emailError) {
        console.error(`Failed to send reminder for vehicle ${reminder.vehicle_id}:`, emailError);
        
        // Log the failed reminder
        await supabase.from('email_reminders').insert({
          vehicle_id: reminder.vehicle_id,
          reminder_type: reminder.reminder_type,
          email_type: reminder.email_type,
          recipient_email: reminder.recipient_email,
          status: 'failed',
          next_reminder_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Retry tomorrow
        });

        failedReminders.push({
          vehicle_id: reminder.vehicle_id,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: reminders?.length || 0,
      sent: sentReminders.length,
      failed: failedReminders.length,
      sentReminders,
      failedReminders
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-email-reminders function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateEmailContent(reminder: VehicleReminder, vehicle: any, cmrFiles: any[] = []) {
  const vehicleInfo = `${vehicle.brand} ${vehicle.model} (${vehicle.license_number || vehicle.vin})`;
  
  if (reminder.reminder_type === 'payment_reminder') {
    return {
      subject: `Herinnering: Betaling voor ${vehicleInfo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Betalingsherinnering</h2>
          <p>Beste klant,</p>
          <p>Dit is een vriendelijke herinnering betreffende de betaling voor uw aankoop:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Voertuig:</strong> ${vehicleInfo}<br>
            <strong>Verkoopdatum:</strong> ${new Date(vehicle.created_at).toLocaleDateString('nl-NL')}
          </div>
          <p>Mocht u vragen hebben over de betaling, neem dan contact met ons op.</p>
          <p>Met vriendelijke groet,<br>
          <strong>Auto City</strong></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            Dit is een automatische herinnering. Als u al heeft betaald, kunt u deze email negeren.
          </p>
        </div>
      `
    };
  } else if (reminder.reminder_type === 'papers_reminder') {
    const supplierName = vehicle.supplier_contact ? 
      `${vehicle.supplier_contact.first_name} ${vehicle.supplier_contact.last_name}` :
      'leverancier';
    
    return {
      subject: `Herinnering: CMR Documenten voor ${vehicleInfo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">CMR Document Herinnering</h2>
          <p>Beste ${supplierName},</p>
          <p>Dit is een herinnering betreffende de CMR documenten voor het volgende voertuig:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Voertuig:</strong> ${vehicleInfo}<br>
            <strong>Verkoopdatum:</strong> ${new Date(vehicle.created_at).toLocaleDateString('nl-NL')}<br>
            ${cmrFiles.length > 0 ? `<strong>CMR Documenten:</strong> ${cmrFiles.length} bestand(en) beschikbaar` : '<strong>Status:</strong> Wachtend op papieren van klant'}
          </div>
          <p>Het voertuig is verkocht maar de papieren zijn nog niet door de klant ontvangen. 
          ${cmrFiles.length > 0 ? 'De bijgevoegde CMR documenten zijn beschikbaar voor verzending.' : 'Zodra de papieren binnen zijn, ontvangt u de CMR documenten.'}</p>
          <p>Bij vragen kunt u altijd contact met ons opnemen.</p>
          <p>Met vriendelijke groet,<br>
          <strong>Auto City</strong></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            Dit is een automatische herinnering. Deze wordt verstuurd zolang de papieren niet als 'binnen' zijn gemarkeerd.
          </p>
        </div>
      `
    };
  }

  // Fallback
  return {
    subject: `Herinnering betreffende ${vehicleInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Herinnering</h2>
        <p>Beste klant,</p>
        <p>Dit is een herinnering betreffende uw voertuig: ${vehicleInfo}</p>
        <p>Neem contact met ons op voor meer informatie.</p>
        <p>Met vriendelijke groet,<br>
        <strong>Auto City</strong></p>
      </div>
    `
  };
}

serve(handler);