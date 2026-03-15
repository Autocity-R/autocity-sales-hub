

# Fix: Model wijzigen van `gpt-image-1` naar `gpt-4.1`

## Wijziging

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

**Regel 282** — verander:
```typescript
model: "gpt-image-1",
```
naar:
```typescript
model: "gpt-4.1",
```

**Regels 264 en 496** — update comments van `gpt-image-1` naar `gpt-4.1` voor consistentie.

Daarna redeploy van de edge function.

