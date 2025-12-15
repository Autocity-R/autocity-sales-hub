import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailGenerationRequest {
  vehicle: {
    brand: string;
    model: string;
    variant?: string;
    buildYear: number;
    fuelType: string;
    transmission: string;
    mileage?: number;
    vin?: string;
    b2bPrice?: number;
    maxDamage?: number;
    extraOptions?: string;
  };
  dealer: {
    name: string;
    email: string;
    soldVehicle?: {
      brand: string;
      model: string;
      buildYear: number;
      price: number;
      soldDaysAgo: number | null;
    };
  };
}

const B2B_SYSTEM_PROMPT = `Je bent een ervaren B2B Sales Specialist met 30+ jaar ervaring in de automotive branche bij Autocity Automotive Group in Rotterdam. Je specialisatie is het verkopen van jong gebruikte voertuigen aan andere autobedrijven.

## CONTEXT DIE JE ONTVANGT
Je krijgt data over:
1. **Het voertuig dat je aanbiedt** - merk, model, bouwjaar, km-stand, brandstof, transmissie, VIN, B2B prijs, max schadebedrag, eventuele extra opties
2. **Het autobedrijf dat je aanschrijft** - naam, of ze recent een vergelijkbaar model hebben verkocht
3. **Of er eerder contact is geweest** - zo ja, pas je intro aan (geen voorstelling meer nodig)

## HOE AUTOCITY WERKT
- Wij zijn gespecialiseerd in jong gebruikte voertuigen
- Wij leveren aan de deur bij het autobedrijf
- Wij kunnen ook op Nederlands kenteken leveren (mits afgesproken)
- Wij hebben een breed B2B netwerk
- Onze prijzen zijn B2B: inclusief BTW, exclusief BPM
- Max schadebedrag betekent het maximum dat wij accepteren aan schade bij levering

## JOUW EXPERTISE
- Je kent ALLE automerken, modellen, motorvarianten, uitvoeringen
- Je begrijpt wat "courant" betekent maar dat is NIET jouw taak om te beoordelen - dat bepaalt het autobedrijf zelf
- Je snapt dat autobedrijven marktgerichte voertuigen zoeken
- Je weet dat snelheid en directheid belangrijk is in B2B

## SCHRIJFSTIJL
### WAT JE WEL DOET:
- Kort, zakelijk, to-the-point
- Professioneel maar niet stijf
- Je vermeldt ALTIJD dat uit jullie database blijkt dat zij recent een vergelijkbaar model hebben verkocht (als dat zo is)
- Je biedt winstmarge aan - zij kunnen zelf bepalen of ze daar gebruik van maken
- Je noemt concrete cijfers: prijs, km-stand, bouwjaar
- Je eindigt met een duidelijke call-to-action (bel of mail voor info)

### WAT JE NIET DOET:
- GEEN verkooppraatjes ("fantastische auto", "geweldige deal", "niet te missen")
- GEEN beoordeling van courantheid - dat bepalen zij
- GEEN druk uitoefenen of urgentie creëren
- GEEN lange inleidingen of wollige teksten
- GEEN herhaling van dezelfde punten
- GEEN beloftes die je niet waar kunt maken

## EMAIL STRUCTUUR
1. **Aanhef**: "Geachte collega's," of persoonlijker als naam bekend
2. **Opening**: Eén zin over waarom je contact opneemt (database match)
3. **Voertuiggegevens**: Compact overzicht met alle relevante specs
4. **Prijs**: B2B prijs + max schadebedrag
5. **Levering**: Korte vermelding leveringsopties
6. **Afsluiting**: Contact info + uitnodiging om te reageren
7. **Ondertekening**: Autocity Automotive Group gegevens

## TONE OF VOICE VOORBEELDEN

✅ GOED: "Uit onze database blijkt dat jullie recent een BMW X3 hebben verkocht. Wij hebben een vergelijkbaar exemplaar beschikbaar."

❌ FOUT: "Wij hebben een fantastische BMW X3 in de aanbieding die perfect past bij jullie assortiment!"

✅ GOED: "De keuze is aan jullie om hier gebruik van te maken."

❌ FOUT: "Mis deze kans niet! Snel reageren want deze gaat snel weg!"

✅ GOED: "B2B prijs: €42.500 incl. BTW ex BPM. Max schade: €500."

❌ FOUT: "Voor slechts €42.500 is deze prachtige auto van u!"

## AANPASSING BIJ HERHAALD CONTACT
Als er eerder contact is geweest met dit autobedrijf:
- Sla de introductie van Autocity over
- Begin directer: "Goed om weer contact te hebben. Wij hebben een interessant aanbod..."
- Verwijs niet naar "uit onze database" - dat weten ze al

Genereer een professionele B2B email op basis van de aangeleverde data. Return ALLEEN de email body tekst, geen JSON of andere formatting.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicle, dealer }: EmailGenerationRequest = await req.json();
    
    console.log('🤖 Generating B2B email for:', {
      vehicle: `${vehicle.brand} ${vehicle.model} ${vehicle.buildYear}`,
      dealer: dealer.name
    });

    // Check for existing contact with this dealer
    let hasExistingContact = false;
    let contactHistory = null;
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Extract domain from dealer email for broader matching
      const emailDomain = dealer.email.split('@')[1];
      
      const { data: existingEmails, error } = await supabase
        .from('email_logs')
        .select('id, sent_at, subject')
        .or(`recipient_email.eq.${dealer.email},recipient_email.ilike.%@${emailDomain}`)
        .order('sent_at', { ascending: false })
        .limit(5);
      
      if (!error && existingEmails && existingEmails.length > 0) {
        hasExistingContact = true;
        contactHistory = {
          totalEmails: existingEmails.length,
          lastContact: existingEmails[0].sent_at,
          lastSubject: existingEmails[0].subject
        };
        console.log('📧 Found existing contact history:', contactHistory);
      }
    } catch (dbError) {
      console.log('⚠️ Could not check contact history:', dbError);
    }

    // Build the user prompt with all vehicle and dealer data
    const userPrompt = `Schrijf een B2B email voor het volgende aanbod:

## VOERTUIG DAT WE AANBIEDEN
- Merk: ${vehicle.brand}
- Model: ${vehicle.model}
${vehicle.variant ? `- Variant: ${vehicle.variant}` : ''}
- Bouwjaar: ${vehicle.buildYear}
- Brandstof: ${vehicle.fuelType}
- Transmissie: ${vehicle.transmission}
${vehicle.mileage ? `- KM-stand: ${vehicle.mileage.toLocaleString('nl-NL')} km` : ''}
${vehicle.vin ? `- VIN: ${vehicle.vin}` : ''}
${vehicle.b2bPrice ? `- B2B Prijs incl. BTW ex BPM: €${vehicle.b2bPrice.toLocaleString('nl-NL')}` : ''}
${vehicle.maxDamage !== undefined ? `- Max. schadebedrag: €${vehicle.maxDamage.toLocaleString('nl-NL')}` : ''}
${vehicle.extraOptions ? `- Extra opties/opmerkingen: ${vehicle.extraOptions}` : ''}

## AUTOBEDRIJF DAT WE AANSCHRIJVEN
- Bedrijfsnaam: ${dealer.name}
- Email: ${dealer.email}
${dealer.soldVehicle ? `
## MATCH UIT DATABASE
Het autobedrijf heeft recent een vergelijkbaar voertuig verkocht:
- ${dealer.soldVehicle.brand} ${dealer.soldVehicle.model} (${dealer.soldVehicle.buildYear})
- Vraagprijs was: €${dealer.soldVehicle.price.toLocaleString('nl-NL')}
- Verkocht: ${dealer.soldVehicle.soldDaysAgo !== null ? `${dealer.soldVehicle.soldDaysAgo} dagen geleden` : 'recentelijk'}
` : ''}
## CONTACT HISTORIE
${hasExistingContact ? `Er is EERDER contact geweest met dit bedrijf (${contactHistory?.totalEmails} emails, laatste: ${contactHistory?.lastContact}). Pas je intro aan - geen volledige voorstelling nodig.` : 'Dit is het EERSTE contact met dit bedrijf. Stel Autocity kort voor.'}

Schrijf nu de email body (geen subject line, alleen de inhoud).`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: B2B_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedEmail = data.choices[0].message.content;

    console.log('✅ B2B email generated successfully');

    return new Response(JSON.stringify({ 
      success: true,
      email: generatedEmail,
      hasExistingContact,
      contactHistory
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ B2B email generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
