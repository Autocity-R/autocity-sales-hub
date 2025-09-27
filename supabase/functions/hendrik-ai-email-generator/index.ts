
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailGenerationRequest {
  lead: any;
  selectedVehicle?: any;
  context: {
    vehicles: any[];
    appointments: any[];
  };
  requestType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead, selectedVehicle, context, requestType }: EmailGenerationRequest = await req.json();
    
    console.log('🧠 Hendrik AI Email Generation:', {
      leadId: lead?.id,
      leadName: lead?.firstName,
      selectedVehicle: selectedVehicle?.brand,
      requestType
    });

    // Build optimized context for OpenAI
    const hendrikContext = buildHendrikContext(lead, selectedVehicle, context);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Je bent Hendrik, de AI Sales Agent van Auto City. Je schrijft professionele en persoonlijke emails voor lead follow-up.

AUTO CITY CONTEXT:
- 55 jaar ervaring in auto verkoop
- BOVAG gecertificeerd 
- Familiebedrijf met persoonlijke service
- Inruilservice en financiering beschikbaar
- Showroom: Hoofdstraat 123, Anytown

SCHRIJF RICHTLIJNEN:
- Altijd professioneel maar vriendelijk
- Gebruik de naam van de klant
- Refereer aan specifieke interesse indien bekend
- Bied altijd een afspraak aan
- Vermeld relevante bedrijfsvoordelen
- Sluit af met contactgegevens

Email moet zijn: zakelijk, persoonlijk, behulpzaam, en actiegericht.`
          },
          {
            role: 'user',
            content: `Schrijf een professionele email voor deze lead:

${hendrikContext}

Genereer een JSON response met:
{
  "subject": "Professionele onderwerpregel",
  "content": "Volledige email inhoud in Nederlandse zakelijke stijl"
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse JSON response
    let emailResult;
    try {
      emailResult = JSON.parse(aiResponse);
    } catch (e) {
      // Fallback if JSON parsing fails
      emailResult = {
        subject: `Persoonlijk contact - ${lead.firstName} - Auto City`,
        content: aiResponse
      };
    }

    console.log('✅ Hendrik AI Email Generated:', {
      subject: emailResult.subject,
      contentLength: emailResult.content?.length
    });

    return new Response(JSON.stringify(emailResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Hendrik AI Email Generation Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      subject: 'Email van Auto City',
      content: 'Er is een probleem opgetreden bij het genereren van de email. Neem contact op voor persoonlijke service.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildHendrikContext(lead: any, selectedVehicle: any, context: any): string {
  let contextString = `LEAD INFORMATIE:
- Naam: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Status: ${lead.status}
- Prioriteit: ${lead.priority}`;

  if (lead.phone) {
    contextString += `\n- Telefoon: ${lead.phone}`;
  }

  if (selectedVehicle) {
    contextString += `\n\nGESELECTEERD VOERTUIG:
- Merk: ${selectedVehicle.brand}
- Model: ${selectedVehicle.model}
- Jaar: ${selectedVehicle.year}
- Prijs: €${selectedVehicle.selling_price?.toLocaleString()}`;
  }

  if (context.vehicles?.length > 0) {
    contextString += `\n\nBESCHIKBARE VOERTUIGEN (top 5):`;
    context.vehicles.slice(0, 5).forEach((vehicle: any) => {
      contextString += `\n- ${vehicle.brand} ${vehicle.model} (${vehicle.year}) - €${vehicle.selling_price?.toLocaleString()}`;
    });
  }

  if (context.appointments?.length > 0) {
    contextString += `\n\nKOMENDE AFSPRAKEN:`;
    context.appointments.forEach((apt: any) => {
      contextString += `\n- ${apt.title} - ${new Date(apt.starttime).toLocaleDateString('nl-NL')}`;
    });
  }

  return contextString;
}
