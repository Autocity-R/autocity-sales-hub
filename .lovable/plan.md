
Doel: de blijvende `Edge Function returned a non-2xx status code` in **Interieur** definitief oplossen.

Wat ik heb vastgesteld (diepe diagnose):
- De frontend-fout is generiek, maar de echte backend-fout is duidelijk in de edge logs:
  - `Unknown parameter: 'response_format'`
- In `supabase/functions/showroom-photo-studio/index.ts` (in `callOpenAIImageEdit`) wordt nu verstuurd:
  - `model: "gpt-image-1"`
  - `images: [{ image_url: dataUrl }]` (correct)
  - `response_format: "b64_json"` (dit veroorzaakt nu de 400)
- Conclusie: de OpenAI key is niet het probleem; request payload is nog niet API-compatibel.

Implementatieplan:
1. **Fix OpenAI payload (interieur)**
   - In `callOpenAIImageEdit()` `response_format` verwijderen uit de JSON body.
   - `images` + `image_url` behouden zoals nu.

2. **Response parsing robuuster maken**
   - Primair `data.data?.[0]?.b64_json` blijven lezen.
   - Fallback toevoegen op eventuele alternatieve velden (`image_base64` / data-url) zodat kleine API-variaties geen 500 meer geven.

3. **Foutdiagnose verbeteren (zonder gevoelige data te loggen)**
   - Bij non-2xx loggen: HTTP status, OpenAI error payload, en gebruikte body keys.
   - Geen volledige base64 in logs.

4. **Batch-fail spam voorkomen**
   - In de frontend (`FotoStudio.tsx`) bij een duidelijke “configuration/parameter” backend-fout de batch vroegtijdig stoppen i.p.v. alle foto’s laten falen.
   - Dit voorkomt kosten en ruis in logs.

5. **Verificatie**
   - Eén interieurfoto testen: verwacht 200 + render van resultaat.
   - Daarna 2-3 foto’s sequentieel testen.
   - Edge logs controleren: geen `Unknown parameter: 'response_format'` meer.

Technische details:
- Bestand: `supabase/functions/showroom-photo-studio/index.ts`
- Functie: `callOpenAIImageEdit(imageBase64, prompt)`
- Kernwijziging: body van
  - `{ ..., response_format: "b64_json" }`
  naar
  - `{ model: "gpt-image-1", images: [{ image_url: dataUrl }], prompt, size: "1024x1024" }`
- Verwachte impact: interieurroute stopt met 400’en; frontend krijgt geen generieke non-2xx meer voor deze fout.
