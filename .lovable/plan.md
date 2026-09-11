# Poetsopdracht aanmaken lukt niet

## Wat er misgaat

Bij het aanmaken van een poetsopdracht kies je geen schadeonderdelen (dat hoort ook niet bij poetsen). Het formulier stuurt dan een leeg onderdelenveld als "niets" naar de database, terwijl de database daar altijd een lijst verwacht — ook een lege. Daardoor wordt de opdracht geweigerd met de foutmelding die je ziet. Dit raakt elke taak zonder gekozen onderdelen, dus ook werkplaats-taken zonder zone.

## Oplossing

- In het taakformulier het onderdelenveld altijd als lijst versturen: gekozen onderdelen, of een lege lijst als er niets is gekozen.
- Poetsopdrachten krijgen zoals nu al de keuze Showroom / Aflevering mee, zodat ze in het Poetsen-menu in de juiste kolom terechtkomen.
- Extra: de losse werkorder-dialoog (o.a. vanuit de planning) stuurt bij poetsen nog geen showroom/aflevering-keuze mee. Daar wordt "showroom" als standaard meegegeven, zodat zulke opdrachten ook netjes in het Poetsen-menu verschijnen.

## Controle na de aanpassing

- Nieuwe poetsopdracht aanmaken (showroom en aflevering) en controleren dat deze zonder fout wordt opgeslagen en in het Poetsen-menu verschijnt in de juiste kolom.
- Een werkplaats-taak zonder gekozen onderdeel aanmaken om te bevestigen dat die ook weer werkt.

## Technisch

- `src/components/aftersales/AddTaskDialog.tsx` regel ~301: `parts: partList.length ? partList : null` → `parts: partList` (kolom `work_orders.parts` is `NOT NULL DEFAULT '[]'::jsonb`).
- `src/components/werkplaats/AddWorkOrderDialog.tsx`: bij `discipline === "poets"` `poets_type: "showroom"` meesturen (check-constraint staat alleen `showroom` of `aflevering` toe).
