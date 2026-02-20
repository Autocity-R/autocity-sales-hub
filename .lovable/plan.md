

# Fix: Website klikbaar maken op productie (duplicate React instances)

## Probleem

Op de gepubliceerde website (autocity-sales-hub.lovable.app) kun je klanten zien maar niets klikken, selecteren of scrollen. In de Lovable preview werkt alles wel.

## Oorzaak

Dit is een bekend probleem met **dubbele React-instanties** in de productie-build. Wanneer meerdere kopieren van React in de bundle terechtkomen, delen componenten geen context meer (state, events, hooks werken niet). Dit verklaart waarom:
- Je elementen **kunt zien** (ze worden gerenderd)
- Je er **niet mee kunt interacteren** (event handlers zijn gekoppeld aan een andere React-instantie)
- Het **wel werkt in development** (Vite's dev-server handelt dit anders af)

## Oplossing

Een eenvoudige configuratiewijziging in `vite.config.ts` die Vite dwingt om altijd dezelfde React-instantie te gebruiken:

### Wijziging in `vite.config.ts`

Toevoegen van `resolve.dedupe` om React-deduplicatie te forceren:

```text
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
  dedupe: ["react", "react-dom", "react/jsx-runtime"],
},
```

Dit zorgt ervoor dat alle libraries in het project dezelfde enkele React-instantie gebruiken, waardoor event handlers, state en context weer correct werken.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `vite.config.ts` | `resolve.dedupe` toevoegen |

## Verwacht resultaat

Na publicatie zou de website weer volledig interactief moeten zijn: klikken, selecteren, scrollen en menu-navigatie werken allemaal correct.

