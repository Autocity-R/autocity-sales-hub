# Garantie-inbox voor de operationeel directeur (volledig meelezen)

## Antwoord op je tweede vraag (spuitdata / medewerkers-KPI)

De medewerkers-KPI's in de cockpit staan **al op het moment van goedkeuren** — niet op het moment dat een order wordt aangemaakt of toegewezen. Dat is de aanpassing van de vorige ronde:

- Aantal klussen, uren, gemiddelde tijd per klus en omzet per uur tellen pas mee zodra de order is goedgekeurd.
- Voor spuiten/schadeherstel geldt strikt het goedkeurmoment.
- Uitdeuken en poetsen kennen geen goedkeurstap; daar geldt het klaarmeldmoment als gelijkwaardig moment.
- Omzet blijft op factuurdatum staan.

Er is dus niets meer aan te passen aan de KPI-telling; wil je dat ik het ergens in de cockpit expliciet benoem ("telt vanaf goedkeuring"), dan doe ik dat erbij.

## Wat we bouwen

De operationeel directeur kan de volledige garantie-mailbox teruglezen — gesprekken, gekoppelde auto's, claims én de AI-chat/concepten — zodat hij meekijkt en het team kan trainen. Versturen of wijzigen kan hij niet (dat blijft bij aftersales).

- In zijn menu komt onder **GARANTIE** naast "Garantieclaims" een tweede regel **"Inbox"**, met het ongelezen-bolletje zoals aftersales dat ook heeft.
- Hij kan alle gesprekken openen en de volledige mailwisseling per klant en per auto lezen, inclusief gekoppeld voertuig, claim, AI-concepten en de AI-chatgeschiedenis per dossier.
- Acties die iets veranderen zijn voor hem verborgen: antwoorden versturen, nieuw AI-concept genereren, afronden/heropenen, voertuig koppelen, claim aanmaken en werkorder inplannen. De rest leest hij mee, precies zoals aftersales het ziet.

## Technische uitvoering

1. `src/lib/routeAccess.ts`: `/garantie` toevoegen aan `DIRECTIE_ALLOWED_PREFIXES`.
2. `src/components/layout/Sidebar.tsx` (directie-navigatie, GARANTIE-sectie): entry `/warranty` uitbreiden met sub `{ url: "/garantie/inbox", label: "Inbox", badge: garantieUnread }` — zelfde patroon als de aftersales-nav; `useGarantieUnread` is daar al beschikbaar.
3. **Migratie**: SELECT-policy op `garantie_agent_chats` uitbreiden met `has_role(auth.uid(), 'operationeel_directeur')` zodat hij de AI-chatgeschiedenis kan teruglezen (INSERT/UPDATE/DELETE blijven beperkt tot aftersales/leiding). Geen GRANT of tabelwijzigingen nodig — tabel bestaat al.
4. `src/pages/garantie/GarantieInbox.tsx`: rol uit `useAuth` lezen en `readOnly = role === "operationeel_directeur"` afleiden; daarmee uitsluitend de wijzig-acties verbergen (antwoordveld + Versturen, AI-concept genereren/Wand2, afronden/heropenen, `SearchableVehicleSelector`, `WarrantyScheduleAction`, notitie-opslag). De AI-chat-tab wél renderen in leesmodus (chat-invoer verbergen). Geen wijziging in de dataqueries; `garantie_email_threads`/`garantie_emails` hebben al SELECT voor alle ingelogden.
5. Verificatie: typecheck plus de bestaande route-tests; daarna in de browser inloggen als operationeel directeur, de inbox openen en controleren dat mails en AI-chat volledig zichtbaar zijn en er geen verstuur- of wijzigknoppen staan. Alleen preview, niet publiceren.
