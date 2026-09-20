# Garantie-inbox voor de operationeel directeur (alleen-lezen)

## Antwoord op je tweede vraag (spuitdata / medewerkers-KPI)

De medewerkers-KPI's in de cockpit staan **al op het moment van goedkeuren** — niet op het moment dat een order wordt aangemaakt of toegewezen. Dat is de aanpassing van de vorige ronde:

- Aantal klussen, uren, gemiddelde tijd per klus en omzet per uur tellen pas mee zodra de order is goedgekeurd.
- Voor spuiten/schadeherstel geldt strikt het goedkeurmoment.
- Uitdeuken en poetsen kennen geen goedkeurstap; daar geldt het klaarmeldmoment als gelijkwaardig moment.
- Omzet blijft op factuurdatum staan.

Er is dus niets meer aan te passen; wil je dat ik het toch ergens in de cockpit expliciet benoem ("telt vanaf goedkeuring"), dan doe ik dat erbij.

## Wat we bouwen

De operationeel directeur krijgt de garantie-mailbox te zien bij Garantie, zodat hij live meekijkt wat er speelt — maar zonder iets te kunnen versturen of wijzigen.

- In zijn menu komt onder **GARANTIE** naast "Garantieclaims" een tweede regel **"Inbox"**, met het ongelezen-bolletje zoals aftersales dat ook heeft.
- Hij kan gesprekken openen en de volledige mailwisseling per klant en per auto lezen, inclusief gekoppeld voertuig en claim.
- Alles wat wijzigt is voor hem verborgen: antwoorden versturen, concepten maken/gebruiken, AI-voorstel genereren, afronden/heropenen, voertuig koppelen, claim aanmaken en werkorder inplannen. Hij ziet dus een leesweergave.
- De AI-chat naast een dossier blijft voor hem dicht (die gegevens zijn afgeschermd voor aftersales/leiding).

## Technische uitvoering

1. `src/lib/routeAccess.ts`: `/garantie` toevoegen aan `DIRECTIE_ALLOWED_PREFIXES`.
2. `src/components/layout/Sidebar.tsx` (directie-navigatie, GARANTIE-sectie): entry `/warranty` met sub `{ url: "/garantie/inbox", label: "Inbox", badge: garantieUnread }` — zelfde patroon als de aftersales-nav; `useGarantieUnread` is daar al beschikbaar.
3. `src/pages/garantie/GarantieInbox.tsx`: rol uit `useAuth` lezen en één `readOnly = role === "operationeel_directeur"` afleiden; daarmee de actie-UI verbergen (antwoordveld + Versturen, AI-concept/Wand2, afronden/heropenen, `SearchableVehicleSelector`, `WarrantyScheduleAction`, notitie-opslag) en de AI-chat-tab niet renderen. Geen wijziging in de dataqueries.
4. RLS is al in orde: `garantie_email_threads` en `garantie_emails` hebben SELECT voor alle ingelogde gebruikers; `garantie_agent_chats` is beperkt tot admin/manager/aftersales_manager, vandaar dat de AI-chat verborgen blijft.
5. Verificatie: typecheck plus de bestaande route-tests; daarna in de browser inloggen als operationeel directeur, de inbox openen en controleren dat er geen verstuur- of wijzigknoppen staan. Alleen preview, niet publiceren.
