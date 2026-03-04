

# Fix: Klanten niet klikbaar op productie - Radix version conflict door cmdk

## Probleem

Op de gepubliceerde website kun je de klantenlijst zien maar nergens op klikken, selecteren of scrollen. In de Lovable preview werkt het wel.

## Echte oorzaak (niet React deduplicatie)

Het probleem is **niet** dubbele React-instanties -- er is slechts 1 React versie geinstalleerd. Het probleem is dat het `cmdk` pakket (v1.0.0) zijn **eigen oude versies** van Radix UI pakketten meebrengt:

- De app gebruikt `@radix-ui/react-dialog` v1.1.2 (nieuw)
- `cmdk` bundelt `@radix-ui/react-dialog` v1.0.5 (oud)
- Plus 12+ andere oude Radix pakketten in `cmdk/node_modules/`

In de klantselector (`SearchableCustomerSelector`) worden `Popover` (nieuwe Radix) en `Command/CommandItem` (cmdk's oude Radix) gecombineerd. In productie creëert dit twee aparte sets van Radix contexts (dismissable layers, focus guards, portals) die elkaar blokkeren. Daardoor worden klik-events op CommandItems niet doorgegeven.

In development omzeilt Vite's dev-server dit probleem, maar de productie-bundler (Rollup) creëert twee aparte codepaden.

## Oplossing

Upgrade `cmdk` van v1.0.0 naar v1.1.1 (of nieuwer). De nieuwere versie:
- Gebruikt compatibele Radix versies (geen nested node_modules meer)
- Verwijdert de `@babel/runtime` dependency
- Lost het context-conflict op

### Wijzigingen

**Bestand: `package.json`**
- `"cmdk": "^1.0.0"` wijzigen naar `"cmdk": "^1.1.1"`

**Bestand: `src/components/ui/command.tsx`**
- Mogelijk kleine API-aanpassingen nodig na upgrade (wordt gecontroleerd)

**Bestand: `vite.config.ts`**
- De bestaande `dedupe` configuratie blijft als extra veiligheid
- Toevoegen van Radix interne pakketten aan dedupe als fallback:
  `@radix-ui/react-dismissable-layer`, `@radix-ui/react-focus-scope`, `@radix-ui/react-portal`, `@radix-ui/react-presence`, `@radix-ui/react-primitive`, `@radix-ui/react-context`

## Verwacht resultaat

Na upgrade en publicatie:
- Klantenlijst is weer klikbaar en scrollbaar
- Selecteren van klanten werkt correct
- Data wordt opgeslagen
- Werkt zowel in preview als op de gepubliceerde website

