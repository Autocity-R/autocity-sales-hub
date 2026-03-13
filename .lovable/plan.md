

# Foto's hernoemen met "CC" suffix

## Probleem
Geüploade foto's krijgen een generieke naam (`autocity_studio_1.png`). Je wilt dat de output dezelfde naam behoudt als het origineel, maar met " CC" erachter. Bijv. `IMG 16.jpg` → `IMG 16 CC.png`.

## Wijzigingen

### 1. Frontend: `src/pages/FotoStudio.tsx`
- **`processImage`**: Stuur `originalFileName: image.originalFile.name` mee in de request body
- **`downloadImage`**: Gebruik de originele bestandsnaam (zonder extensie) + " CC.png" als downloadnaam. Pas de functie aan zodat deze de originele filename accepteert
- **`downloadAll`**: Geef de originele filename door aan `downloadImage`

### 2. Backend: `supabase/functions/showroom-photo-studio/index.ts`
- Lees `originalFileName` uit de request body
- Strip de extensie en voeg " CC" toe
- Gebruik deze naam in het `storagePath`:
  - `showroom/vehicle_{id}/{originalName} CC.png` (i.p.v. `photo_0_timestamp.png`)
  - Standalone: `showroom/standalone/{originalName} CC_{timestamp}.png`

### Resultaat
`IMG 16.jpg` upload → opgeslagen als `IMG 16 CC.png` → download als `IMG 16 CC.png`

